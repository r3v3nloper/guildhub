import { and, eq, isNull } from "drizzle-orm";
import type { AppDatabase, DbExecutor } from "@/lib/db/client";
import { accounts, allowlistEntries } from "@/lib/db/schema";
import type { ServerEnv } from "@/lib/env";

export type AllowlistEntry = typeof allowlistEntries.$inferSelect;

/**
 * The DB is the source of truth (SPEC 7.2). ENV only seeds it: IDs are added on every
 * start but never removed, and the owner is always re-admitted as a rescue path.
 */
export function seedAllowlistFromEnv(
  db: AppDatabase,
  env: Pick<ServerEnv, "ownerDiscordId" | "allowedDiscordIds">,
): void {
  const ids = [...env.allowedDiscordIds];
  if (env.ownerDiscordId) {
    ids.push(env.ownerDiscordId);
  }
  for (const discordId of ids) {
    db.insert(allowlistEntries)
      .values({ discordId, source: "env" })
      .onConflictDoNothing()
      .run();
  }
}

export function isDiscordIdAllowed(
  db: AppDatabase,
  discordId: string,
): boolean {
  return (
    db
      .select({ discordId: allowlistEntries.discordId })
      .from(allowlistEntries)
      .where(eq(allowlistEntries.discordId, discordId))
      .get() !== undefined
  );
}

export function addToAllowlist(
  db: AppDatabase,
  discordId: string,
  addedBy: string,
): void {
  db.insert(allowlistEntries)
    .values({ discordId, addedBy, source: "admin" })
    .onConflictDoNothing()
    .run();
}

export function removeFromAllowlist(db: DbExecutor, discordId: string): void {
  db.delete(allowlistEntries)
    .where(eq(allowlistEntries.discordId, discordId))
    .run();
}

export function listAllowlist(db: AppDatabase): AllowlistEntry[] {
  return db.select().from(allowlistEntries).all();
}

/** Admitted IDs that have never signed in, so no member exists for them yet. */
export function listPendingAllowlist(db: AppDatabase): AllowlistEntry[] {
  return db
    .select({
      discordId: allowlistEntries.discordId,
      addedBy: allowlistEntries.addedBy,
      addedAt: allowlistEntries.addedAt,
      source: allowlistEntries.source,
    })
    .from(allowlistEntries)
    .leftJoin(
      accounts,
      and(
        eq(accounts.provider, "discord"),
        eq(accounts.providerAccountId, allowlistEntries.discordId),
      ),
    )
    .where(isNull(accounts.userId))
    .all();
}
