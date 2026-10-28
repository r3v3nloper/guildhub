import path from "node:path";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { ForbiddenError, type Actor } from "@/lib/auth/guards";
import type { AppDatabase } from "@/lib/db/client";
import { auditLogs, games, guildGames, guilds } from "@/lib/db/schema";
import { createDiscordUser, createTestDb } from "@/lib/db/test-db";
import { DomainError } from "@/lib/errors";
import { loadPacks } from "@/lib/packs/loader";
import { syncPacks } from "@/lib/packs/sync";
import {
  renameGuildAsAdmin,
  setGameEnabled,
  setGameRegion,
} from "./games-admin";
import { ensureGuild } from "./guild";

describe("games admin", () => {
  let db: AppDatabase;
  let officer: Actor;
  let member: Actor;

  beforeEach(() => {
    db = createTestDb();
    const guildId = ensureGuild(db, {
      guildName: "Gilde",
      defaultTimezone: "Europe/Berlin",
    }).id;
    syncPacks(db, loadPacks(path.resolve("packs"), { includeHidden: false }));
    officer = {
      userId: createDiscordUser(db, "100000000000000001"),
      guildId,
      role: "officer",
      status: "active",
    };
    member = { userId: "member", guildId, role: "member", status: "active" };
  });

  function guildGame(gameId: string) {
    return db
      .select()
      .from(guildGames)
      .where(eq(guildGames.gameId, gameId))
      .get();
  }

  it("lets an officer enable a game and records it", () => {
    setGameEnabled(db, officer, "aion2", true);

    expect(guildGame("aion2")?.enabled).toBe(true);
    expect(db.select().from(auditLogs).get()).toMatchObject({
      action: "game.enable",
      target: "aion2",
    });
  });

  it("does not let a member enable games", () => {
    expect(() => setGameEnabled(db, member, "aion2", true)).toThrow(
      ForbiddenError,
    );
  });

  it("only accepts regions the pack defines", () => {
    const meta = db.select().from(games).where(eq(games.id, "aion2")).get()!
      .meta;
    db.update(games)
      .set({
        meta: {
          ...meta,
          regions: [
            ...meta.regions,
            { id: "na", timezone: "America/New_York" },
          ],
        },
      })
      .where(eq(games.id, "aion2"))
      .run();

    setGameRegion(db, officer, "aion2", "na");

    expect(guildGame("aion2")?.regionId).toBe("na");
    expect(() => setGameRegion(db, officer, "aion2", "mars")).toThrow(
      DomainError,
    );
  });

  it("trims the guild name and rejects empty or overly long ones", () => {
    renameGuildAsAdmin(db, officer, "  Neue Gilde  ");

    expect(db.select().from(guilds).get()?.name).toBe("Neue Gilde");
    expect(() => renameGuildAsAdmin(db, officer, "   ")).toThrow(DomainError);
    expect(() => renameGuildAsAdmin(db, officer, "x".repeat(61))).toThrow(
      DomainError,
    );
  });
});
