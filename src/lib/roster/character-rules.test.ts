import { describe, expect, it } from "vitest";
import type { CatalogStatus, GameMeta } from "@/lib/db/schema";
import type { CatalogKind } from "@/lib/packs/catalog";
import {
  characterHints,
  resolveCharacter,
  type CharacterInput,
} from "./character-rules";
import type { CatalogEntry, GameCatalog } from "./game-catalog";

let nextId = 1;
function entry(
  kind: CatalogKind,
  key: string,
  data: Record<string, unknown> = {},
  status: CatalogStatus = "active",
): CatalogEntry {
  return {
    id: nextId++,
    gameId: "wow",
    kind,
    key,
    name: key,
    data,
    status,
    lastSeenPackVersion: "1.0.0",
    todo: false,
  };
}

const alliance = entry("faction", "alliance");
const horde = entry("faction", "horde");
const paladin = entry("class", "paladin", { factions: ["alliance"] });
const shaman = entry("class", "shaman", { factions: ["horde"] });
const warrior = entry("class", "warrior");
const oldClass = entry("class", "old", {}, "deprecated");
const human = entry("race", "human", {
  faction: "alliance",
  allowed_classes: ["warrior", "paladin"],
});
const orc = entry("race", "orc", {
  faction: "horde",
  allowed_classes: ["warrior", "shaman"],
});
const mining = entry("profession", "mining");

function catalog(
  capabilities: Partial<GameMeta["capabilities"]>,
  entries: CatalogEntry[] = [
    alliance,
    horde,
    paladin,
    shaman,
    warrior,
    oldClass,
    human,
    orc,
    mining,
  ],
): GameCatalog {
  return {
    game: {
      id: "wow",
      name: "WoW",
      packVersion: "1.0.0",
      meta: {
        type: "mmo",
        characterLabel: "Charakter",
        serverLabel: "Realm",
        regions: [],
        buildSources: [],
        capabilities: {
          characters: true,
          classes: false,
          races: false,
          professions: false,
          builds: false,
          resets: false,
          lockouts: false,
          factions: false,
          servers: false,
          guild_overview: false,
          progress_tracking: false,
          ...capabilities,
        },
      },
    },
    entries,
  };
}

const wow = catalog({
  classes: true,
  races: true,
  factions: true,
  professions: true,
  servers: true,
});

function input(overrides: Partial<CharacterInput> = {}): CharacterInput {
  return {
    name: "Anduin",
    server: "",
    factionKey: "",
    raceKey: "human",
    classKey: "paladin",
    specKey: "",
    offSpecKey: "",
    spec: "",
    level: null,
    isMain: false,
    notes: "",
    professionKeys: [],
    ...overrides,
  };
}

describe("resolveCharacter", () => {
  it("derives the faction from the race", () => {
    const result = resolveCharacter(wow, input());

    expect(result).toMatchObject({
      ok: true,
      value: {
        raceEntryId: human.id,
        factionEntryId: alliance.id,
        classEntryId: paladin.id,
        specEntryId: null,
        offSpecEntryId: null,
      },
    });
  });

  it("requires class and race when their capabilities are on", () => {
    const result = resolveCharacter(wow, input({ raceKey: "", classKey: "" }));

    expect(result).toEqual({
      ok: false,
      errors: { raceKey: "Rasse wählen.", classKey: "Klasse wählen." },
    });
  });

  it("requires the faction when factions are on but races are not", () => {
    const result = resolveCharacter(
      catalog({ classes: true, factions: true }),
      input({ raceKey: "", classKey: "warrior" }),
    );

    expect(result).toEqual({
      ok: false,
      errors: { factionKey: "Fraktion wählen." },
    });
  });

  it("ignores fields whose capability is off", () => {
    const result = resolveCharacter(
      catalog({ classes: true }),
      input({ raceKey: "orc", classKey: "warrior", server: "Somewhere" }),
    );

    expect(result).toMatchObject({
      ok: true,
      value: { raceEntryId: null, factionEntryId: null, serverKey: null },
    });
  });

  it("rejects a class the race cannot be", () => {
    const result = resolveCharacter(
      wow,
      input({ raceKey: "orc", classKey: "paladin" }),
    );

    expect(result.ok).toBe(false);
  });

  it("rejects a class not available to the faction", () => {
    const result = resolveCharacter(
      catalog({ classes: true, factions: true }),
      input({ raceKey: "", factionKey: "horde", classKey: "paladin" }),
    );

    expect(result).toMatchObject({
      ok: false,
      errors: { classKey: expect.any(String) },
    });
  });

  it("does not offer deprecated entries for new characters", () => {
    const result = resolveCharacter(
      catalog({ classes: true }),
      input({ raceKey: "", classKey: "old" }),
    );

    expect(result).toEqual({
      ok: false,
      errors: { classKey: "Nicht auswählbar." },
    });
  });

  it("keeps a deprecated class that the character already has", () => {
    const result = resolveCharacter(
      catalog({ classes: true }),
      input({ raceKey: "", classKey: "old" }),
      {
        classEntryId: oldClass.id,
        specEntryId: null,
        offSpecEntryId: null,
        factionEntryId: null,
        raceEntryId: null,
        serverKey: null,
        professionEntryIds: [],
      },
    );

    expect(result.ok).toBe(true);
  });

  it("does not enforce restrictions retroactively when the combination is unchanged", () => {
    const result = resolveCharacter(
      wow,
      input({ raceKey: "orc", classKey: "paladin", name: "Neuer Name" }),
      {
        raceEntryId: orc.id,
        factionEntryId: horde.id,
        classEntryId: paladin.id,
        specEntryId: null,
        offSpecEntryId: null,
        serverKey: null,
        professionEntryIds: [],
      },
    );

    expect(result.ok).toBe(true);
  });

  it("normalises free-text servers into a shared key", () => {
    const result = resolveCharacter(
      wow,
      input({ server: "  Thunder   Strike " }),
    );

    expect(result).toMatchObject({
      ok: true,
      value: { serverKey: "thunder strike", serverName: "Thunder Strike" },
    });
  });

  it("validates level and name", () => {
    const result = resolveCharacter(wow, input({ name: " ", level: 0 }));

    expect(result).toMatchObject({
      ok: false,
      errors: { name: "Name fehlt.", level: expect.any(String) },
    });
  });

  it("maps professions and rejects unknown ones", () => {
    expect(
      resolveCharacter(wow, input({ professionKeys: ["mining", "mining"] })),
    ).toMatchObject({
      ok: true,
      value: { professionEntryIds: [mining.id] },
    });
    expect(
      resolveCharacter(wow, input({ professionKeys: ["cooking"] })).ok,
    ).toBe(false);
  });
});

describe("characterHints", () => {
  it("asks for a class when it is required but missing", () => {
    const hints = characterHints(catalog({ classes: true }), {
      classEntryId: null,
      specEntryId: null,
      offSpecEntryId: null,
      raceEntryId: null,
      factionEntryId: null,
      serverKey: null,
      professionEntryIds: [],
    });

    expect(hints).toEqual([{ field: "classKey", message: "Klasse wählen." }]);
  });

  it("flags a class that is no longer in the pack", () => {
    const removed = entry("class", "gone", {}, "removed");
    const hints = characterHints(catalog({ classes: true }, [removed]), {
      classEntryId: removed.id,
      specEntryId: null,
      offSpecEntryId: null,
      raceEntryId: null,
      factionEntryId: null,
      serverKey: null,
      professionEntryIds: [],
    });

    expect(hints[0].message).toMatch(/nicht mehr im Pack/);
  });
});

describe("specializations", () => {
  const holy = entry("spec", "paladin-holy", {
    class: "paladin",
    role: "heal",
  });
  const protection = entry("spec", "paladin-protection", {
    class: "paladin",
    role: "tank",
  });
  const arms = entry("spec", "warrior-arms", {
    class: "warrior",
    role: "melee",
  });
  const withSpecs = catalog({ classes: true }, [
    paladin,
    warrior,
    holy,
    protection,
    arms,
  ]);
  const specInput = (overrides: Partial<CharacterInput>) =>
    input({ raceKey: "", classKey: "paladin", ...overrides });

  it("stores main and off-spec and drops the free-text spec", () => {
    // Act
    const result = resolveCharacter(
      withSpecs,
      specInput({
        specKey: "paladin-holy",
        offSpecKey: "paladin-protection",
        spec: "Heilig",
      }),
    );

    // Assert
    expect(result).toMatchObject({
      ok: true,
      value: {
        specEntryId: holy.id,
        offSpecEntryId: protection.id,
        spec: null,
      },
    });
  });

  it("allows a character without spec", () => {
    // Act
    const result = resolveCharacter(withSpecs, specInput({}));

    // Assert
    expect(result).toMatchObject({
      ok: true,
      value: { specEntryId: null, offSpecEntryId: null },
    });
  });

  it("rejects a spec of another class", () => {
    // Act
    const result = resolveCharacter(
      withSpecs,
      specInput({ specKey: "warrior-arms" }),
    );

    // Assert
    expect(result).toMatchObject({
      ok: false,
      errors: { specKey: expect.stringMatching(/Passt nicht/) },
    });
  });

  it("rejects an off-spec without main spec or equal to it", () => {
    // Act
    const withoutMain = resolveCharacter(
      withSpecs,
      specInput({ offSpecKey: "paladin-holy" }),
    );
    const same = resolveCharacter(
      withSpecs,
      specInput({ specKey: "paladin-holy", offSpecKey: "paladin-holy" }),
    );

    // Assert
    expect(withoutMain).toMatchObject({
      ok: false,
      errors: { offSpecKey: expect.stringMatching(/Hauptspezialisierung/) },
    });
    expect(same).toMatchObject({
      ok: false,
      errors: { offSpecKey: expect.stringMatching(/gleich/) },
    });
  });

  it("keeps the free-text spec in games without spec catalog", () => {
    // Act
    const result = resolveCharacter(
      catalog({ classes: true }, [paladin]),
      specInput({ spec: "Heilig" }),
    );

    // Assert
    expect(result).toMatchObject({ ok: true, value: { spec: "Heilig" } });
  });

  it("hints at a missing spec, since the role is unknown then", () => {
    // Act
    const hints = characterHints(withSpecs, {
      classEntryId: paladin.id,
      specEntryId: null,
      offSpecEntryId: null,
      raceEntryId: null,
      factionEntryId: null,
      serverKey: null,
      professionEntryIds: [],
    });

    // Assert
    expect(hints).toEqual([
      {
        field: "specKey",
        message: "Ohne Spezialisierung ist die Rolle unbekannt.",
      },
    ]);
  });
});
