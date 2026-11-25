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
import { addonPack } from "../../../test/fixtures/addon";
import { createGuildFixture } from "../../../test/fixtures/guild";
import { encodeAddonString } from "./addon-string";
import { applyImport, previewImport, previewKey } from "./character-import";

const pack = addonPack;

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

  function createCharacter(owner: Actor, name: string, deathCount = 0): number {
    const saved = saveCharacter(
      db,
      owner,
      "wow-test",
      characterInput({
        name,
        server: "Die Aldor",
        raceKey: "orc",
        classKey: "shaman",
        level: 20,
        deathCount,
        professionKeys: ["alchemy"],
      }),
    );
    if (!saved.ok) {
      throw new Error("Testcharakter nicht gespeichert");
    }
    return saved.characterId;
  }

  describe("first names and surnames (WoW Forever)", () => {
    it("recognizes a character typed with other case and spacing", () => {
      // Arrange
      const id = createCharacter(anna, "relitia  Relikt");
      const text = exportText(
        "C,Die Aldor,Relitia Relikt,Horde,Orc,SHAMAN,30,",
      );

      // Act
      const preview = previewImport(db, anna, "wow-test", text);

      // Assert
      expect(preview).toMatchObject({
        ok: true,
        characters: [{ characterId: id, status: "changed", renamesFrom: null }],
      });
    });

    it("adds the surname to a character GuildHub knows by its first name", () => {
      // Arrange
      const id = createCharacter(anna, "Relitia");
      const text = exportText(
        "C,Die Aldor,Relitia Relikt,Horde,Orc,SHAMAN,20,",
      );

      // Act
      const preview = previewImport(db, anna, "wow-test", text);
      applyImport(db, anna, "wow-test", text, NO_CHOICES);

      // Assert
      expect(preview).toMatchObject({
        ok: true,
        characters: [{ characterId: id, renamesFrom: "Relitia" }],
      });
      expect(getCharacter(db, id)!.name).toBe("Relitia Relikt");
    });

    it("prefers the full name over a first-name duplicate", () => {
      // Arrange
      createCharacter(anna, "Relitia");
      const full = createCharacter(anna, "Relitia Relikt");
      const text = exportText(
        "C,Die Aldor,Relitia Relikt,Horde,Orc,SHAMAN,20,",
      );

      // Act
      const preview = previewImport(db, anna, "wow-test", text);

      // Assert
      expect(preview).toMatchObject({
        ok: true,
        characters: [{ characterId: full, renamesFrom: null }],
      });
    });

    it("does not take another member's first name for the same character", () => {
      // Arrange
      createCharacter(ben, "Relitia");
      const text = exportText(
        "C,Die Aldor,Relitia Relikt,Horde,Orc,SHAMAN,20,",
      );

      // Act
      const preview = previewImport(db, anna, "wow-test", text);

      // Assert
      expect(preview).toMatchObject({
        ok: true,
        characters: [{ status: "new" }],
      });
    });
  });

  describe("blocks other addons passed on in the game (SPEC 7.3.3)", () => {
    it("lets an officer update a member's account and create its new characters for them", () => {
      // Arrange
      const jainaId = createCharacter(ben, "Jaina", 4);
      const text = exportText(
        "O,annaacc1",
        "U,benacc01,1794916800",
        "C,Die Aldor,Jaina,,,,30,2",
        "P,171,80,2330",
        "C,Die Aldor,Kael,Horde,Orc,WARRIOR,12,",
      );
      const kael = previewKey({ realm: "Die Aldor", name: "Kael" });

      // Act
      const preview = previewImport(db, anna, "wow-test", text);
      const result = applyImport(db, anna, "wow-test", text, {
        create: [kael],
        dropProfessions: {},
      });

      // Assert
      expect(preview).toMatchObject({
        ok: true,
        characters: [
          { name: "Jaina", status: "changed", memberName: "User 0002" },
          { name: "Kael", status: "new", memberName: "User 0002" },
        ],
        skippedAccounts: [],
      });
      expect(result).toMatchObject({
        ok: true,
        outcomes: [
          { name: "Jaina", result: "saved" },
          { name: "Kael", result: "saved" },
        ],
      });
      expect(getCharacter(db, jainaId)).toMatchObject({
        userId: ben.userId,
        level: 30,
        deathCount: 6,
      });
      expect(
        db.select().from(characters).where(eq(characters.name, "Kael")).get(),
      ).toMatchObject({ userId: ben.userId, level: 12 });
    });

    it("never offers to drop a profession of another member", () => {
      // Arrange
      createCharacter(ben, "Jaina");
      const text = exportText(
        "U,benacc01,1794916800",
        "C,Die Aldor,Jaina,,,,20,",
      );

      // Act
      const preview = previewImport(db, anna, "wow-test", text);

      // Assert
      expect(preview).toMatchObject({
        ok: true,
        characters: [{ name: "Jaina", missingProfessionEntryIds: [] }],
      });
    });

    it("imports only a member's own account and names the others", () => {
      // Arrange
      const thrallId = createThrall();
      createCharacter(ben, "Jaina");
      const text = exportText(
        "O,benacc01",
        "C,Die Aldor,Jaina,,,,25,",
        "U,annaacc1,1794916800",
        "C,Die Aldor,Thrall,,,,60,",
      );

      // Act
      const preview = previewImport(db, ben, "wow-test", text);
      applyImport(db, ben, "wow-test", text, NO_CHOICES);

      // Assert
      expect(preview).toMatchObject({
        ok: true,
        characters: [{ name: "Jaina", memberName: null }],
        skippedAccounts: [{ characterNames: ["Thrall"], reason: "notOfficer" }],
      });
      expect(getCharacter(db, thrallId)!.level).toBe(40);
    });

    it.each([
      [
        "no character GuildHub knows",
        ["C,Die Aldor,Kael,,,,12,"],
        "unknownCharacters",
      ],
      [
        "characters of two members",
        ["C,Die Aldor,Thrall,,,,40,", "C,Die Aldor,Jaina,,,,20,"],
        "severalMembers",
      ],
    ])("skips an account with %s", (_, records, reason) => {
      // Arrange
      createThrall();
      createCharacter(ben, "Jaina");
      const text = exportText("U,someacc1,1794916800", ...records);

      // Act
      const preview = previewImport(db, anna, "wow-test", text);

      // Assert
      expect(preview).toMatchObject({
        ok: true,
        characters: [],
        skippedAccounts: [{ reason }],
      });
    });
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
