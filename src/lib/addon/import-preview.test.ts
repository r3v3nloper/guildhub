import { describe, expect, it } from "vitest";
import type { GameMeta } from "@/lib/db/schema";
import type { CatalogKind } from "@/lib/packs/catalog";
import type { CatalogEntry, GameCatalog } from "@/lib/roster/game-catalog";
import type { ExportedCharacter } from "./export-payload";
import {
  previewCharacterImport,
  type ForeignCharacter,
  type OwnCharacterState,
} from "./import-preview";

let nextId = 1;
function entry(
  kind: CatalogKind,
  key: string,
  data: Record<string, unknown> = {},
): CatalogEntry {
  return {
    id: nextId++,
    gameId: "wow-forever",
    kind,
    key,
    name: { de: key, en: key },
    data,
    status: "active",
    lastSeenPackVersion: "1.0.0",
    todo: false,
  };
}

const horde = entry("faction", "horde", { game_ref: "Horde" });
const orc = entry("race", "orc", { game_ref: "Orc" });
const shaman = entry("class", "shaman", { game_ref: "SHAMAN" });
const warrior = entry("class", "warrior", { game_ref: "WARRIOR" });
const alchemy = entry("profession", "alchemy", { game_ref: "171" });
const herbalism = entry("profession", "herbalism", { game_ref: "182" });
const minorHealing = entry("recipe", "alchemy-2330", { profession: "alchemy" });
const swiftness = entry("recipe", "alchemy-2335", { profession: "alchemy" });

function catalog(capabilities: Partial<GameMeta["capabilities"]> = {}) {
  return {
    game: {
      id: "wow-forever",
      name: "WoW Forever",
      packVersion: "1.0.0",
      meta: {
        type: "mmo",
        characterLabel: "Charakter",
        serverLabel: "Realm",
        regions: [],
        buildSources: [],
        capabilities: {
          characters: true,
          classes: true,
          races: true,
          professions: true,
          builds: false,
          resets: false,
          lockouts: false,
          factions: true,
          servers: true,
          guild_overview: false,
          progress_tracking: false,
          death_count: true,
          addon_import: true,
          ...capabilities,
        },
      },
    },
    withRecipes: true,
    entries: [
      horde,
      orc,
      shaman,
      warrior,
      alchemy,
      herbalism,
      minorHealing,
      swiftness,
    ],
  } satisfies GameCatalog;
}

function exported(
  overrides: Partial<ExportedCharacter> = {},
): ExportedCharacter {
  return {
    realm: "Die Aldor",
    name: "Thrall",
    factionRef: "Horde",
    raceRef: "Orc",
    classRef: "SHAMAN",
    level: 42,
    deaths: null,
    professions: [],
    ...overrides,
  };
}

function owned(overrides: Partial<OwnCharacterState> = {}): OwnCharacterState {
  return {
    id: 7,
    name: "Thrall",
    serverKey: "die aldor",
    factionEntryId: horde.id,
    raceEntryId: orc.id,
    classEntryId: shaman.id,
    level: 42,
    deathCount: 0,
    addonDeathCount: null,
    professions: [],
    linkedRecipeIds: [],
    ...overrides,
  };
}

function preview(
  characters: ExportedCharacter[],
  own: OwnCharacterState[] = [],
  foreign: ForeignCharacter[] = [],
  meta: Partial<GameMeta["capabilities"]> = {},
) {
  return previewCharacterImport({
    catalog: catalog(meta),
    data: { characters },
    own,
    foreign,
  });
}

describe("previewCharacterImport", () => {
  it("offers a new character and changes a known one", () => {
    // Arrange
    const existing = owned({
      level: 40,
      professions: [{ entryId: alchemy.id, skillLevel: 100 }],
      linkedRecipeIds: [minorHealing.id],
    });
    const thrall = exported({
      professions: [{ ref: "171", skill: 150, spellIds: [2330, 2335] }],
    });
    const grom = exported({ name: "Grom", classRef: "WARRIOR", level: 10 });

    // Act
    const [known, fresh] = preview([thrall, grom], [existing]);

    // Assert
    expect(known).toMatchObject({
      status: "changed",
      characterId: 7,
      changedFields: ["level"],
      professions: [
        { entryId: alchemy.id, skillLevel: 150, previousSkillLevel: 100 },
      ],
      newRecipes: [
        { professionEntryId: alchemy.id, recipeEntryId: swiftness.id },
      ],
    });
    expect(fresh).toMatchObject({
      status: "new",
      characterId: null,
      serverKey: "die aldor",
      values: { classEntryId: warrior.id, level: 10 },
    });
  });

  it("reports nothing to do when the game matches GuildHub", () => {
    // Act
    const [result] = preview([exported()], [owned()]);

    // Assert
    expect(result.status).toBe("unchanged");
  });

  it("never takes over a character of another member", () => {
    // Act
    const [result] = preview(
      [exported({ name: "THRALL" })],
      [],
      [{ name: "Thrall", serverKey: "die aldor" }],
    );

    // Assert
    expect(result).toMatchObject({ status: "foreign", characterId: null });
  });

  it("matches an own character entered without a server and fills the server in", () => {
    // Act
    const [result] = preview([exported()], [owned({ serverKey: null })]);

    // Assert
    expect(result).toMatchObject({
      status: "changed",
      characterId: 7,
      serverKey: "die aldor",
      fillsInServer: true,
    });
  });

  it("names professions the game no longer has, but keeps them for now", () => {
    // Arrange
    const existing = owned({
      professions: [{ entryId: herbalism.id, skillLevel: 80 }],
    });

    // Act
    const [result] = preview([exported()], [existing]);

    // Assert
    expect(result.missingProfessionEntryIds).toEqual([herbalism.id]);
    expect(result.professions).toEqual([]);
  });

  it("lists what the pack does not know and keeps the old value", () => {
    // Arrange
    const thrall = exported({
      raceRef: "Dracthyr",
      professions: [
        { ref: "171", skill: 1, spellIds: [999999] },
        { ref: "773", skill: 1, spellIds: [] },
      ],
    });

    // Act
    const [result] = preview([thrall], [owned()]);

    // Assert
    expect(result.values.raceEntryId).toBeNull();
    expect(result.changedFields).not.toContain("race");
    expect(result.unknown).toEqual([
      { kind: "race", ref: "Dracthyr" },
      { kind: "profession", ref: "773" },
      { kind: "recipes", count: 1 },
    ]);
  });

  describe("deaths", () => {
    // SPEC Phase 6: 5 by hand, addon reports 2 → 7, then 3 → 8, reinstalled and 1 → 9.
    it.each([
      [null, 2, 2],
      [2, 3, 1],
      [3, 1, 1],
    ])("adds %s → %s as %s", (lastAddonCount, addonCount, expectedAdd) => {
      // Arrange
      const existing = owned({
        deathCount: 5,
        addonDeathCount: lastAddonCount,
      });

      // Act
      const [result] = preview([exported({ deaths: addonCount })], [existing]);

      // Assert
      expect(result.deathsToAdd).toBe(expectedAdd);
      expect(result.addonDeathCount).toBe(addonCount);
    });

    it("adds nothing for a game without death count", () => {
      // Act
      const [result] = preview([exported({ deaths: 4 })], [owned()], [], {
        death_count: false,
      });

      // Assert
      expect(result.deathsToAdd).toBe(0);
    });
  });
});
