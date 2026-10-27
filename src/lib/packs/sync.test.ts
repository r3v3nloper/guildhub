import { and, eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import type { AppDatabase } from "@/lib/db/client";
import {
  builds,
  characterProfessions,
  characters,
  gameCatalogEntries,
  games,
  guildGames,
  syncLogs,
} from "@/lib/db/schema";
import { createDiscordUser, createTestDb } from "@/lib/db/test-db";
import { ensureGuild } from "@/lib/guild/guild";
import type { LoadedPack } from "./loader";
import { failingPacks } from "./status";
import { syncPack } from "./sync";
import { validatePack } from "./validate";

const env = { guildName: "Testgilde", defaultTimezone: "Europe/Berlin" };

function packFile(overrides: Record<string, unknown> = {}): LoadedPack {
  const raw = {
    id: "game",
    name: "Spiel",
    version: "1.0.0",
    capabilities: { classes: true, professions: true },
    regions: [{ id: "eu", timezone: "Europe/Berlin" }],
    classes: [
      { id: "warrior", name: "Krieger", role: "tank" },
      { id: "mage", name: "Magier", role: "dps" },
    ],
    professions: [
      { id: "mining", name: "Bergbau", kind: "gathering" },
      { id: "smithing", name: "Schmieden" },
    ],
    ...overrides,
  };
  return {
    folderName: "game",
    file: "packs/game/pack.json",
    content: JSON.stringify(raw),
    ...validatePack(raw, "game"),
  };
}

function entry(db: AppDatabase, kind: string, key: string) {
  return db
    .select()
    .from(gameCatalogEntries)
    .where(
      and(
        eq(gameCatalogEntries.gameId, "game"),
        eq(gameCatalogEntries.kind, kind as never),
        eq(gameCatalogEntries.key, key),
      ),
    )
    .get()!;
}

function createCharacter(db: AppDatabase, classKey: string) {
  const userId = createDiscordUser(db, "123456789012345678");
  return db
    .insert(characters)
    .values({
      userId,
      gameId: "game",
      name: "Thrall",
      classEntryId: entry(db, "class", classKey).id,
    })
    .returning()
    .get();
}

describe("syncPack", () => {
  let db: AppDatabase;

  beforeEach(() => {
    db = createTestDb();
    ensureGuild(db, env);
  });

  it("creates the game, its catalog and a disabled guild game", () => {
    const result = syncPack(db, packFile());

    expect(result.status).toBe("success");
    expect(result.summary).toMatchObject({ added: 4, changed: 0, removed: 0 });
    expect(db.select().from(games).get()?.packVersion).toBe("1.0.0");
    expect(entry(db, "class", "warrior")).toMatchObject({
      status: "active",
      data: { role: "tank", factions: [] },
    });
    expect(db.select().from(guildGames).get()).toMatchObject({
      enabled: false,
      regionId: "eu",
    });
  });

  it("skips an unchanged pack", () => {
    syncPack(db, packFile());

    expect(syncPack(db, packFile()).status).toBe("skipped");
  });

  it("updates names in place, keeping references", () => {
    syncPack(db, packFile());
    const character = createCharacter(db, "warrior");

    const result = syncPack(
      db,
      packFile({
        version: "1.1.0",
        classes: [
          { id: "warrior", name: "Kämpfer", role: "tank" },
          { id: "mage", name: "Magier", role: "dps" },
        ],
      }),
    );

    expect(result.summary?.changed).toBe(1);
    const warrior = entry(db, "class", "warrior");
    expect(warrior.name).toBe("Kämpfer");
    expect(
      db.select().from(characters).where(eq(characters.id, character.id)).get()
        ?.classEntryId,
    ).toBe(warrior.id);
  });

  it("marks deprecated entries without touching characters", () => {
    syncPack(db, packFile());
    createCharacter(db, "mage");

    const result = syncPack(
      db,
      packFile({
        version: "1.1.0",
        classes: [
          { id: "warrior", name: "Krieger", role: "tank" },
          { id: "mage", name: "Magier", role: "dps", deprecated: true },
        ],
      }),
    );

    expect(result.summary?.deprecated).toBe(1);
    expect(entry(db, "class", "mage").status).toBe("deprecated");
  });

  it("keeps a removed class on the character and reports it", () => {
    syncPack(db, packFile());
    const character = createCharacter(db, "mage");

    const result = syncPack(
      db,
      packFile({
        version: "2.0.0",
        classes: [{ id: "warrior", name: "Krieger", role: "tank" }],
      }),
    );

    const mage = entry(db, "class", "mage");
    expect(mage.status).toBe("removed");
    expect(
      db.select().from(characters).where(eq(characters.id, character.id)).get()
        ?.classEntryId,
    ).toBe(mage.id);
    expect(result.summary?.affected_characters).toEqual([
      { character_id: character.id, field: "class", old_id: "mage" },
    ]);
  });

  it("migrates characters and builds via replaces", () => {
    syncPack(db, packFile());
    const character = createCharacter(db, "mage");
    db.insert(builds)
      .values({
        characterId: character.id,
        title: "Nächste Klasse",
        status: "planned",
        targetClassEntryId: entry(db, "class", "mage").id,
      })
      .run();

    const result = syncPack(
      db,
      packFile({
        version: "2.0.0",
        classes: [
          { id: "warrior", name: "Krieger", role: "tank" },
          { id: "sorcerer", name: "Zauberer", role: "dps", replaces: ["mage"] },
        ],
      }),
    );

    const sorcerer = entry(db, "class", "sorcerer");
    expect(entry(db, "class", "mage").status).toBe("removed");
    expect(
      db.select().from(characters).where(eq(characters.id, character.id)).get()
        ?.classEntryId,
    ).toBe(sorcerer.id);
    expect(db.select().from(builds).get()?.targetClassEntryId).toBe(
      sorcerer.id,
    );
    expect(result.summary?.migrations).toEqual([
      {
        kind: "class",
        from: "mage",
        to: "sorcerer",
        rows_rewritten: 2,
        rows_merged: 0,
      },
    ]);
    expect(result.summary?.affected_characters).toEqual([]);
  });

  it("merges professions when a character already has the replacement", () => {
    syncPack(db, packFile());
    const character = createCharacter(db, "warrior");
    for (const key of ["mining", "smithing"]) {
      db.insert(characterProfessions)
        .values({
          characterId: character.id,
          professionEntryId: entry(db, "profession", key).id,
        })
        .run();
    }

    const result = syncPack(
      db,
      packFile({
        version: "2.0.0",
        professions: [
          { id: "smithing", name: "Schmieden", replaces: ["mining"] },
        ],
      }),
    );

    expect(db.select().from(characterProfessions).all()).toEqual([
      expect.objectContaining({
        professionEntryId: entry(db, "profession", "smithing").id,
      }),
    ]);
    expect(result.summary?.migrations[0]).toMatchObject({
      rows_rewritten: 0,
      rows_merged: 1,
    });
  });

  it("skips an invalid pack, keeps the last good state and reports it", () => {
    syncPack(db, packFile());
    const invalid = packFile({ version: "2.0.0", classes: [{ id: "mage" }] });

    const result = syncPack(db, invalid);

    expect(result.status).toBe("error");
    expect(result.error).toMatch(/classes\[0\]\.name/);
    expect(db.select().from(games).get()).toMatchObject({
      packVersion: "1.0.0",
      lastSyncError: result.error,
    });
    expect(entry(db, "class", "warrior").status).toBe("active");
    expect(failingPacks(db).map((log) => log.gameId)).toEqual(["game"]);
  });

  it("rolls back every change if the sync fails midway", () => {
    syncPack(db, packFile());
    db.run(
      sql.raw(`CREATE TRIGGER fail_on_boom BEFORE INSERT ON game_catalog_entry
        WHEN NEW.key = 'boom' BEGIN SELECT RAISE(ABORT, 'boom'); END;`),
    );

    const result = syncPack(
      db,
      packFile({
        version: "2.0.0",
        name: "Neuer Name",
        classes: [
          { id: "warrior", name: "Geändert", role: "tank" },
          { id: "boom", name: "Boom" },
        ],
      }),
    );

    expect(result.status).toBe("error");
    expect(db.select().from(games).get()).toMatchObject({
      name: "Spiel",
      packVersion: "1.0.0",
    });
    expect(entry(db, "class", "warrior").name).toBe("Krieger");
    expect(entry(db, "class", "mage").status).toBe("active");
    expect(
      db
        .select()
        .from(syncLogs)
        .all()
        .map((log) => log.status),
    ).toEqual(["success", "error"]);
  });
});
