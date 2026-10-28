import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import type { AppDatabase } from "@/lib/db/client";
import { characters, games, sessions } from "@/lib/db/schema";
import { addMember, createDiscordUser, createTestDb } from "@/lib/db/test-db";
import { ensureGuild } from "@/lib/guild/guild";
import {
  isDiscordIdAllowed,
  listAllowlist,
  seedAllowlistFromEnv,
} from "./allowlist";
import { ForbiddenError } from "./guards";
import {
  admitToAllowlist,
  changeMemberRole,
  disableMember,
  ensureMembershipOnSignIn,
  ensureOwnerFromEnv,
  getActor,
  purgeMember,
  reactivateMember,
} from "./membership";

const OWNER = "100000000000000001";
const OFFICER = "100000000000000002";
const MEMBER = "100000000000000003";
const STRANGER = "100000000000000009";

describe("allowlist and membership", () => {
  let db: AppDatabase;
  let guildId: number;
  const env = {
    ownerDiscordId: OWNER,
    allowedDiscordIds: [MEMBER],
    guildName: "Testgilde",
    defaultTimezone: "Europe/Berlin",
  };

  beforeEach(() => {
    db = createTestDb();
    guildId = ensureGuild(db, env).id;
    seedAllowlistFromEnv(db, env);
  });

  function signIn(discordId: string): string {
    const userId = createDiscordUser(db, discordId);
    ensureMembershipOnSignIn(db, guildId, userId, discordId, env);
    return userId;
  }

  function actorOf(userId: string) {
    return getActor(db, guildId, userId)!;
  }

  it("seeds owner and allowed IDs from ENV, and never removes on a later start", () => {
    seedAllowlistFromEnv(db, { ...env, allowedDiscordIds: [] });

    expect(
      listAllowlist(db)
        .map((entry) => entry.discordId)
        .sort(),
    ).toEqual([OWNER, MEMBER].sort());
    expect(isDiscordIdAllowed(db, STRANGER)).toBe(false);
  });

  it("makes the ENV owner an owner and everyone else a member on first sign-in", () => {
    const ownerId = signIn(OWNER);
    const memberId = signIn(MEMBER);

    expect(actorOf(ownerId).role).toBe("owner");
    expect(actorOf(memberId).role).toBe("member");
  });

  it("restores the ENV owner on start even after being demoted", () => {
    const ownerId = signIn(OWNER);
    const otherOwner = signIn(MEMBER);
    changeMemberRole(db, actorOf(ownerId), otherOwner, "owner");
    changeMemberRole(db, actorOf(otherOwner), ownerId, "member");

    ensureOwnerFromEnv(db, guildId, env);

    expect(actorOf(ownerId).role).toBe("owner");
  });

  it("disables a member: access gone, sessions deleted, characters kept", () => {
    const ownerId = signIn(OWNER);
    const memberId = signIn(MEMBER);
    db.insert(sessions)
      .values({
        sessionToken: "t",
        userId: memberId,
        expires: new Date(Date.now() + 1e6),
      })
      .run();
    db.insert(games)
      .values({
        id: "game",
        name: "Spiel",
        meta: {} as never,
        packVersion: "1.0.0",
        packHash: "x",
      })
      .run();
    db.insert(characters)
      .values({ userId: memberId, gameId: "game", name: "Jaina" })
      .run();

    const result = disableMember(db, actorOf(ownerId), memberId, env);

    expect(actorOf(memberId).status).toBe("disabled");
    expect(isDiscordIdAllowed(db, MEMBER)).toBe(false);
    expect(
      db.select().from(sessions).where(eq(sessions.userId, memberId)).all(),
    ).toEqual([]);
    expect(db.select().from(characters).all()).toHaveLength(1);
    expect(result.readmittedOnRestart).toBe(true);
  });

  it("reactivates a member by re-admitting them", () => {
    const ownerId = signIn(OWNER);
    const memberId = signIn(MEMBER);
    disableMember(db, actorOf(ownerId), memberId, env);

    reactivateMember(db, actorOf(ownerId), memberId);

    expect(actorOf(memberId).status).toBe("active");
    expect(isDiscordIdAllowed(db, MEMBER)).toBe(true);
  });

  it("does not let a member admit people", () => {
    const memberId = signIn(MEMBER);

    expect(() => admitToAllowlist(db, actorOf(memberId), STRANGER)).toThrow(
      ForbiddenError,
    );
  });

  it("admits a trimmed Discord ID and rejects anything else", () => {
    const ownerId = signIn(OWNER);

    admitToAllowlist(db, actorOf(ownerId), `  ${STRANGER} `);

    expect(isDiscordIdAllowed(db, STRANGER)).toBe(true);
    expect(() => admitToAllowlist(db, actorOf(ownerId), "reven102")).toThrow(
      /17 bis 20 Ziffern/,
    );
  });

  it("does not let an officer disable another officer", () => {
    const ownerId = signIn(OWNER);
    const officerA = createDiscordUser(db, OFFICER);
    addMember(db, guildId, officerA, "officer");
    const officerB = createDiscordUser(db, "100000000000000004");
    addMember(db, guildId, officerB, "officer");

    expect(() => disableMember(db, actorOf(officerA), officerB, env)).toThrow(
      ForbiddenError,
    );
    expect(() =>
      disableMember(db, actorOf(ownerId), officerB, env),
    ).not.toThrow();
  });

  it("does not let the last owner demote themself", () => {
    const ownerId = signIn(OWNER);

    expect(() =>
      changeMemberRole(db, actorOf(ownerId), ownerId, "member"),
    ).toThrow(/letzte aktive Owner/);
  });

  it("purges a disabled member with all their data", () => {
    const ownerId = signIn(OWNER);
    const memberId = signIn(MEMBER);
    disableMember(db, actorOf(ownerId), memberId, env);

    purgeMember(db, actorOf(ownerId), memberId);

    expect(getActor(db, guildId, memberId)).toBeUndefined();
  });
});
