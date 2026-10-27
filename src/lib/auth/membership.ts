import { and, eq, sql } from "drizzle-orm";
import { recordAudit } from "@/lib/audit/audit";
import type { AppDatabase } from "@/lib/db/client";
import {
  accounts,
  guildMembers,
  sessions,
  users,
  type MemberRole,
} from "@/lib/db/schema";
import type { ServerEnv } from "@/lib/env";
import { DomainError, NotFoundError } from "@/lib/errors";
import {
  addToAllowlist,
  isDiscordIdAllowed,
  removeFromAllowlist,
} from "./allowlist";
import {
  assertAllowed,
  permissions,
  type Actor,
  type MemberTarget,
} from "./guards";

type OwnerEnv = Pick<ServerEnv, "ownerDiscordId">;

export interface MemberView extends MemberTarget {
  name: string | null;
  image: string | null;
  discordId: string | null;
  disabledAt: Date | null;
}

export function discordIdOfUser(
  db: AppDatabase,
  userId: string,
): string | undefined {
  return db
    .select({ discordId: accounts.providerAccountId })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.provider, "discord")))
    .get()?.discordId;
}

function userIdOfDiscordId(
  db: AppDatabase,
  discordId: string,
): string | undefined {
  return db
    .select({ userId: accounts.userId })
    .from(accounts)
    .where(
      and(
        eq(accounts.provider, "discord"),
        eq(accounts.providerAccountId, discordId),
      ),
    )
    .get()?.userId;
}

function upsertMember(
  db: AppDatabase,
  guildId: number,
  userId: string,
  values: { role?: MemberRole; status: "active" },
) {
  db.insert(guildMembers)
    .values({
      guildId,
      userId,
      role: values.role ?? "member",
      status: "active",
    })
    .onConflictDoUpdate({
      target: [guildMembers.guildId, guildMembers.userId],
      set: { ...values, disabledAt: null },
    })
    .run();
}

/**
 * Runs after every successful Discord sign-in. Being on the allowlist is what admits a
 * person, so a previously disabled member who was re-admitted becomes active again.
 */
export function ensureMembershipOnSignIn(
  db: AppDatabase,
  guildId: number,
  userId: string,
  discordId: string,
  env: OwnerEnv,
): void {
  if (discordId === env.ownerDiscordId) {
    upsertMember(db, guildId, userId, { role: "owner", status: "active" });
    return;
  }
  if (isDiscordIdAllowed(db, discordId)) {
    upsertMember(db, guildId, userId, { status: "active" });
  }
}

/** Rescue path (SPEC 7.2): the ENV owner is active and owner after every start. */
export function ensureOwnerFromEnv(
  db: AppDatabase,
  guildId: number,
  env: OwnerEnv,
): void {
  if (!env.ownerDiscordId) {
    return;
  }
  const userId = userIdOfDiscordId(db, env.ownerDiscordId);
  if (userId) {
    upsertMember(db, guildId, userId, { role: "owner", status: "active" });
  }
}

export function getActor(
  db: AppDatabase,
  guildId: number,
  userId: string,
): Actor | undefined {
  const member = db
    .select()
    .from(guildMembers)
    .where(
      and(eq(guildMembers.guildId, guildId), eq(guildMembers.userId, userId)),
    )
    .get();
  return (
    member && {
      userId,
      guildId,
      role: member.role,
      status: member.status,
    }
  );
}

export function listMembers(db: AppDatabase, guildId: number): MemberView[] {
  return db
    .select({
      userId: guildMembers.userId,
      role: guildMembers.role,
      status: guildMembers.status,
      disabledAt: guildMembers.disabledAt,
      name: users.name,
      image: users.image,
      discordId: accounts.providerAccountId,
    })
    .from(guildMembers)
    .innerJoin(users, eq(users.id, guildMembers.userId))
    .leftJoin(
      accounts,
      and(eq(accounts.userId, users.id), eq(accounts.provider, "discord")),
    )
    .where(eq(guildMembers.guildId, guildId))
    .orderBy(guildMembers.status, sql`lower(${users.name})`)
    .all();
}

function getTarget(
  db: AppDatabase,
  guildId: number,
  userId: string,
): MemberTarget {
  const target = getActor(db, guildId, userId);
  if (!target) {
    throw new NotFoundError("Mitglied");
  }
  return target;
}

function countActiveOwners(db: AppDatabase, guildId: number): number {
  return (
    db
      .select({ count: sql<number>`count(*)` })
      .from(guildMembers)
      .where(
        and(
          eq(guildMembers.guildId, guildId),
          eq(guildMembers.role, "owner"),
          eq(guildMembers.status, "active"),
        ),
      )
      .get()?.count ?? 0
  );
}

export function admitToAllowlist(
  db: AppDatabase,
  actor: Actor,
  discordId: string,
): void {
  assertAllowed(permissions.addToAllowlist(actor));
  addToAllowlist(db, discordId, actor.userId);
  recordAudit(db, actor.userId, "allowlist.add", discordId);
}

/** Removes a pending entry, i.e. someone who was admitted but never signed in. */
export function revokeAllowlistEntry(
  db: AppDatabase,
  actor: Actor,
  discordId: string,
): void {
  assertAllowed(permissions.addToAllowlist(actor));
  if (userIdOfDiscordId(db, discordId)) {
    throw new DomainError(
      "Diese Person ist schon Mitglied; bitte deaktivieren.",
    );
  }
  removeFromAllowlist(db, discordId);
  recordAudit(db, actor.userId, "allowlist.remove", discordId);
}

export interface DisableResult {
  /** The ID is still in ALLOWED_DISCORD_IDS and will be re-added on the next start. */
  readmittedOnRestart: boolean;
}

/**
 * Disabling removes access immediately: allowlist entry gone, all sessions deleted.
 * Characters and progress stay, hidden by default (SPEC 7.2).
 */
export function disableMember(
  db: AppDatabase,
  actor: Actor,
  targetUserId: string,
  env: Pick<ServerEnv, "allowedDiscordIds" | "ownerDiscordId">,
): DisableResult {
  const target = getTarget(db, actor.guildId, targetUserId);
  assertAllowed(
    permissions.disableMember(
      actor,
      target,
      countActiveOwners(db, actor.guildId),
    ),
  );

  const discordId = discordIdOfUser(db, targetUserId);
  db.transaction((tx) => {
    tx.update(guildMembers)
      .set({ status: "disabled", disabledAt: new Date() })
      .where(
        and(
          eq(guildMembers.guildId, actor.guildId),
          eq(guildMembers.userId, targetUserId),
        ),
      )
      .run();
    tx.delete(sessions).where(eq(sessions.userId, targetUserId)).run();
  });
  if (discordId) {
    removeFromAllowlist(db, discordId);
  }
  recordAudit(db, actor.userId, "member.disable", targetUserId, { discordId });

  return {
    readmittedOnRestart:
      discordId !== undefined &&
      (env.allowedDiscordIds.includes(discordId) ||
        env.ownerDiscordId === discordId),
  };
}

export function reactivateMember(
  db: AppDatabase,
  actor: Actor,
  targetUserId: string,
): void {
  const target = getTarget(db, actor.guildId, targetUserId);
  assertAllowed(permissions.reactivateMember(actor, target));

  db.update(guildMembers)
    .set({ status: "active", disabledAt: null })
    .where(
      and(
        eq(guildMembers.guildId, actor.guildId),
        eq(guildMembers.userId, targetUserId),
      ),
    )
    .run();
  const discordId = discordIdOfUser(db, targetUserId);
  if (discordId) {
    addToAllowlist(db, discordId, actor.userId);
  }
  recordAudit(db, actor.userId, "member.reactivate", targetUserId);
}

export function changeMemberRole(
  db: AppDatabase,
  actor: Actor,
  targetUserId: string,
  role: MemberRole,
): void {
  const target = getTarget(db, actor.guildId, targetUserId);
  assertAllowed(
    permissions.changeRole(
      actor,
      target,
      role,
      countActiveOwners(db, actor.guildId),
    ),
  );

  db.update(guildMembers)
    .set({ role })
    .where(
      and(
        eq(guildMembers.guildId, actor.guildId),
        eq(guildMembers.userId, targetUserId),
      ),
    )
    .run();
  recordAudit(db, actor.userId, "member.role", targetUserId, {
    from: target.role,
    to: role,
  });
}

/** Irreversibly deletes a disabled member and everything they own (cascades from user). */
export function purgeMember(
  db: AppDatabase,
  actor: Actor,
  targetUserId: string,
): void {
  const target = getTarget(db, actor.guildId, targetUserId);
  assertAllowed(permissions.purgeMemberData(actor, target));

  const discordId = discordIdOfUser(db, targetUserId);
  db.delete(users).where(eq(users.id, targetUserId)).run();
  if (discordId) {
    removeFromAllowlist(db, discordId);
  }
  recordAudit(db, actor.userId, "member.purge", targetUserId, { discordId });
}
