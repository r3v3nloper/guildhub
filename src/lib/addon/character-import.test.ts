import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import type { Actor } from "@/lib/auth/guards";
import type { AppDatabase } from "@/lib/db/client";
import { characters } from "@/lib/db/schema";
import { DomainError } from "@/lib/errors";
import { getCharacter, saveCharacter } from "@/lib/roster/characters";
import { saveProfessionDetails } from "@/lib/roster/character-professions";
import { listRecipes } from "@/lib/roster/recipes";
import { characterInput } from "../../../test/fixtures/characters";
import { createGuildFixture } from "../../../test/fixtures/guild";
import { encodeAddonString } from "./addon-string";
import { applyImport, previewImport, previewKey } from "./character-import";

const pack = {
  id: "wow-test",
  name: "WoW Test",
  version: "1.0.0",
  capabilities: {
    classes: true,
    races: true,
    factions: true,
    professions: true,
    servers: true,
    death_count: true,
    addon_import: true,
  },
  factions: [{ id: "horde", name: "Horde", game_ref: "Horde" }],
  races: [
    {
      id: "orc",
      name: "Orc",
      game_ref: "Orc",
      faction: "horde",
      allowed_classes: ["shaman", "warrior"],
    },
  ],
  classes: [
    { id: "shaman", name: "Schamane", role: "heal", game_ref: "SHAMAN" },
    { id: "warrior", name: "Krieger", role: "tank", game_ref: "WARRIOR" },
  ],
  professions: [
    { id: "alchemy", name: "Alchemie", game_ref: "171" },
    {
      id: "herbalism",
      name: "Kräuterkunde",
      kind: "gathering",
      game_ref: "182",
    },
  ],
  recipes: [
    { id: "alchemy-2330", name: "Schwacher Heiltrank", profession: "alchemy" },
    { id: "alchemy-2335", name: "Beweglichkeitstrank", profession: "alchemy" },
  ],
};

function exportText(...records: string[]) {
  return encodeAddonString({
    gameId: "wow-test",
    kind: "export",
    payload: records.join(";"),
  });
}

const NO_CHOICES = { create: [], dropProfessions: {} };

describe("character import", () => {
  let db: AppDatabase;
  let anna: Actor;
  let ben: Actor;

  beforeEach(() => {
    ({
      db,
      actors: [anna, ben],
    } = createGuildFixture(pack, [
      { discordId: "100000000000000001", role: "owner" },
      { discordId: "100000000000000002" },
    ]));
  });

  function createThrall(): number {
    const saved = saveCharacter(
      db,
      anna,
      "wow-test",
      characterInput({
        name: "Thrall",
        server: "Die Aldor",
        raceKey: "orc",
        classKey: "shaman",
        level: 40,
        deathCount: 5,
        notes: "Main-Heiler",
        professionKeys: ["alchemy"],
      }),
    );
    if (!saved.ok) {
      throw new Error("Testcharakter nicht gespeichert");
    }
    saveProfessionDetails(db, anna, saved.characterId, catalogId("alchemy"), {
      skillLevel: 100,
      specialization: "",
      notes: "",
      recipes: "Schwacher Heiltrank\nEigener Trank – Freitext",
    });
    return saved.characterId;
  }

  function catalogId(key: string): number {
    const row = db.query.gameCatalogEntries
      .findFirst({ where: (entry, { eq: is }) => is(entry.key, key) })
      .sync();
    return row!.id;
  }

  it("updates a known character and creates a ticked new one", () => {
    // Arrange
    const thrallId = createThrall();
    const text = exportText(
      "C,Die Aldor,Thrall,Horde,Orc,SHAMAN,42,2",
      "P,171,150,2330,2335",
      "C,Die Aldor,Grom,Horde,Orc,WARRIOR,10,0",
    );

    // Act
    const result = applyImport(db, anna, "wow-test", text, {
      create: [previewKey({ realm: "Die Aldor", name: "Grom" })],
      dropProfessions: {},
    });

    // Assert
    expect(result).toMatchObject({
      ok: true,
      outcomes: [
        { name: "Thrall", result: "saved" },
        { name: "Grom", result: "saved" },
      ],
    });
    const thrall = getCharacter(db, thrallId)!;
    expect(thrall).toMatchObject({
      level: 42,
      deathCount: 7,
      addonDeathCount: 2,
      notes: "Main-Heiler",
    });
    expect(thrall.gameImportedAt).toBeInstanceOf(Date);
    expect(thrall.professions[0]).toMatchObject({ skillLevel: 150 });
    expect(listRecipes(db, thrallId).map((recipe) => recipe.name)).toEqual([
      "Schwacher Heiltrank",
      "Eigener Trank",
      "Beweglichkeitstrank",
    ]);
    const grom = db
      .select()
      .from(characters)
      .where(eq(characters.name, "Grom"))
      .get();
    expect(grom).toMatchObject({ userId: anna.userId, level: 10 });
  });

  it("adds only the deaths the addon counted since the last import", () => {
    // Arrange
    const thrallId = createThrall();
    const importDeaths = (deaths: number) =>
      applyImport(
        db,
        anna,
        "wow-test",
        exportText(`C,Die Aldor,Thrall,Horde,Orc,SHAMAN,40,${deaths}`),
        NO_CHOICES,
      );

    // Act
    importDeaths(2);
    importDeaths(3);
    importDeaths(1);

    // Assert: 5 by hand → 7 → 8, reinstalled addon → 9 (SPEC Phase 6)
    expect(getCharacter(db, thrallId)!.deathCount).toBe(9);
  });

  it("leaves a new character alone unless it is ticked", () => {
    // Act
    const result = applyImport(
      db,
      anna,
      "wow-test",
      exportText("C,Die Aldor,Grom,Horde,Orc,WARRIOR,10,0"),
      NO_CHOICES,
    );

    // Assert
    expect(result).toMatchObject({
      ok: true,
      outcomes: [{ name: "Grom", result: "skipped" }],
    });
    expect(db.select().from(characters).all()).toEqual([]);
  });

  it("never takes over another member's character", () => {
    // Arrange
    const thrallId = createThrall();
    const text = exportText("C,Die Aldor,Thrall,Horde,Orc,SHAMAN,60,0");

    // Act
    const preview = previewImport(db, ben, "wow-test", text);
    const result = applyImport(db, ben, "wow-test", text, {
      create: [previewKey({ realm: "Die Aldor", name: "Thrall" })],
      dropProfessions: {},
    });

    // Assert
    expect(preview).toMatchObject({
      ok: true,
      characters: [{ status: "foreign" }],
    });
    expect(result).toMatchObject({
      ok: true,
      outcomes: [{ result: "skipped" }],
    });
    expect(getCharacter(db, thrallId)!.level).toBe(40);
  });

  it("drops a profession the game no longer has only when ticked, with its recipes", () => {
    // Arrange
    const thrallId = createThrall();
    const text = exportText("C,Die Aldor,Thrall,Horde,Orc,SHAMAN,40,0");
    const key = previewKey({ realm: "Die Aldor", name: "Thrall" });

    // Act
    applyImport(db, anna, "wow-test", text, NO_CHOICES);
    const kept = getCharacter(db, thrallId)!.professionEntryIds;
    applyImport(db, anna, "wow-test", text, {
      create: [],
      dropProfessions: { [key]: [catalogId("alchemy")] },
    });

    // Assert
    expect(kept).toEqual([catalogId("alchemy")]);
    expect(getCharacter(db, thrallId)!.professionEntryIds).toEqual([]);
    expect(listRecipes(db, thrallId)).toEqual([]);
  });

  it("rejects a damaged export without changing anything", () => {
    // Arrange
    const thrallId = createThrall();
    const text = exportText("C,Die Aldor,Thrall,Horde,Orc,SHAMAN,60,0");

    // Act
    const result = applyImport(
      db,
      anna,
      "wow-test",
      text.slice(0, -2),
      NO_CHOICES,
    );

    // Assert
    expect(result).toMatchObject({ ok: false });
    expect(getCharacter(db, thrallId)!.level).toBe(40);
  });

  it("refuses games without the addon import", () => {
    // Arrange
    const { db: otherDb, actors } = createGuildFixture(
      { ...pack, capabilities: { ...pack.capabilities, addon_import: false } },
      [{ discordId: "100000000000000001", role: "owner" }],
    );

    // Act
    const act = () =>
      previewImport(otherDb, actors[0], "wow-test", exportText());

    // Assert
    expect(act).toThrow(DomainError);
  });
});
