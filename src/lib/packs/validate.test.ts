import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadPacks } from "./loader";
import { formatPath, validatePack } from "./validate";

function basePack(overrides: Record<string, unknown> = {}) {
  return {
    id: "test-game",
    name: "Testspiel",
    version: "1.0.0",
    capabilities: { classes: true, resets: true },
    regions: [{ id: "eu", timezone: "Europe/Berlin" }],
    classes: [{ id: "warrior", name: "Krieger", role: "tank" }],
    reset_rules: [{ id: "daily", type: "daily", time: "05:00" }],
    ...overrides,
  };
}

function errorsOf(raw: unknown) {
  return validatePack(raw, "test-game").errors;
}

describe("validatePack", () => {
  it("accepts a minimal valid pack and applies defaults", () => {
    const result = validatePack(basePack(), "test-game");

    expect(result.errors).toEqual([]);
    expect(result.pack?.type).toBe("mmo");
    expect(result.pack?.capabilities.characters).toBe(true);
    expect(result.pack?.character_label).toBe("Charakter");
  });

  it("reports schema violations with their JSON path", () => {
    const errors = errorsOf(
      basePack({
        classes: [{ id: "warrior", name: "Krieger", role: "berserker" }],
      }),
    );

    expect(errors).toEqual([
      expect.objectContaining({ path: "classes[0].role" }),
    ]);
  });

  it("rejects unknown keys, so typos do not pass silently", () => {
    const errors = errorsOf(basePack({ clases: [] }));

    expect(errors[0].message).toMatch(/clases/);
  });

  it("reports duplicate IDs within a catalog", () => {
    const errors = errorsOf(
      basePack({
        classes: [
          { id: "warrior", name: "Krieger" },
          { id: "warrior", name: "Krieger 2" },
        ],
      }),
    );

    expect(errors).toEqual([
      { path: "classes[1].id", message: "doppelte ID 'warrior'" },
    ]);
  });

  it("reports a task with an unknown reset_rule_id", () => {
    const errors = errorsOf(
      basePack({
        tasks: [
          {
            id: "weekly-quest",
            kind: "recurring",
            title: "Weekly",
            scope: "character",
            reset_rule_id: "weekly",
          },
        ],
      }),
    );

    expect(errors).toEqual([
      {
        path: "tasks[0].reset_rule_id",
        message: "unbekannte Reset-Regel 'weekly'",
      },
    ]);
  });

  it("reports a counter without cap", () => {
    const errors = errorsOf(
      basePack({
        tasks: [
          {
            id: "duty",
            kind: "counter",
            title: "Duty",
            scope: "character",
            reset_rule_id: "daily",
          },
        ],
      }),
    );

    expect(errors).toEqual([
      { path: "tasks[0].cap", message: "Pflicht bei kind counter" },
    ]);
  });

  it("accepts only http(s) guide links on tasks", () => {
    // Arrange
    const task = {
      id: "quest",
      kind: "one_time",
      title: "Quest",
      scope: "character",
    };

    // Act
    const errors = errorsOf(
      basePack({ tasks: [{ ...task, link: "javascript:alert(1)" }] }),
    );

    // Assert
    expect(errors).toEqual([
      { path: "tasks[0].link", message: "nur http(s)-Links" },
    ]);
    expect(
      errorsOf(basePack({ tasks: [{ ...task, link: "https://example.org" }] })),
    ).toEqual([]);
  });

  it("requires the folder name to match the pack id", () => {
    const errors = validatePack(basePack(), "other-folder").errors;

    expect(errors).toEqual([expect.objectContaining({ path: "id" })]);
  });

  it("rejects catalogs whose capability is off", () => {
    const errors = errorsOf(
      basePack({ races: [{ id: "human", name: "Mensch" }] }),
    );

    expect(errors).toEqual([
      {
        path: "races",
        message: "nur erlaubt, wenn capabilities.races aktiv ist",
      },
    ]);
  });

  it("requires regions when resets are enabled", () => {
    const errors = errorsOf(basePack({ regions: [] }));

    expect(errors[0].path).toBe("regions");
  });

  it("checks references between races, factions and classes", () => {
    const errors = errorsOf(
      basePack({
        capabilities: {
          classes: true,
          races: true,
          factions: true,
          resets: true,
        },
        factions: [{ id: "alliance", name: "Allianz" }],
        races: [
          {
            id: "orc",
            name: "Orc",
            faction: "horde",
            allowed_classes: ["shaman"],
          },
        ],
      }),
    );

    expect(errors.map((e) => e.path)).toEqual([
      "races[0].faction",
      "races[0].allowed_classes[0]",
    ]);
  });

  it("checks that a spec belongs to a known class", () => {
    // Act
    const errors = errorsOf(
      basePack({
        specs: [
          {
            id: "warrior-arms",
            name: "Waffen",
            class: "warrior",
            role: "melee",
          },
          { id: "mage-fire", name: "Feuer", class: "mage", role: "ranged" },
        ],
      }),
    );

    // Assert
    expect(errors.map((e) => e.path)).toEqual(["specs[1].class"]);
  });

  it("checks that a recipe belongs to a known profession", () => {
    // Act
    const errors = errorsOf(
      basePack({
        capabilities: { classes: true, resets: true, professions: true },
        professions: [{ id: "mining", name: "Bergbau" }],
        recipes: [
          { id: "r1", name: "Thoriumbarren", profession: "mining" },
          { id: "r2", name: "Mondstoff", profession: "tailoring" },
        ],
      }),
    );

    // Assert
    expect(errors.map((e) => e.path)).toEqual(["recipes[1].profession"]);
  });

  it("checks that a gathering guide belongs to a known profession", () => {
    // Act
    const errors = errorsOf(
      basePack({
        capabilities: { classes: true, resets: true, professions: true },
        professions: [{ id: "mining", name: "Bergbau", kind: "gathering" }],
        gathering: [
          { id: "mining", name: "Bergbau", profession: "mining" },
          { id: "herbalism", name: "Kräuterkunde", profession: "herbalism" },
        ],
      }),
    );

    // Assert
    expect(errors.map((e) => e.path)).toEqual(["gathering[1].profession"]);
  });

  it("rejects replaces pointing at an ID that is still active", () => {
    const errors = errorsOf(
      basePack({
        classes: [
          { id: "warrior", name: "Krieger" },
          { id: "fighter", name: "Kämpfer", replaces: ["warrior"] },
        ],
      }),
    );

    expect(errors[0].path).toBe("classes[1].replaces[0]");
  });

  it("enforces per-kind task fields", () => {
    const errors = errorsOf(
      basePack({
        tasks: [
          {
            id: "energy",
            kind: "regen",
            title: "Energie",
            scope: "character",
            cap: 100,
            regen_amount: 15,
            regen_interval_minutes: 180,
            alert_at: 150,
            per_period_gain: 2,
          },
          {
            id: "story",
            kind: "one_time",
            title: "Story",
            scope: "user",
            reset_rule_id: "daily",
          },
        ],
      }),
    );

    expect(errors.map((e) => e.path)).toEqual([
      "tasks[0].per_period_gain",
      "tasks[0].alert_at",
      "tasks[1].scope",
      "tasks[1].reset_rule_id",
    ]);
  });

  it("warns, but does not fail, when a reset time falls into a DST hour", () => {
    const result = validatePack(
      basePack({
        reset_rules: [{ id: "night", type: "daily", time: "02:30" }],
      }),
      "test-game",
    );

    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([
      expect.objectContaining({ path: "reset_rules[0].time" }),
    ]);
  });

  it("rejects unknown time zones", () => {
    const errors = errorsOf(
      basePack({ regions: [{ id: "eu", timezone: "Europe/Atlantis" }] }),
    );

    expect(errors[0].path).toBe("regions[0].timezone");
  });
});

describe("formatPath", () => {
  it("joins keys with dots and indexes with brackets", () => {
    expect(formatPath(["tasks", 3, "bosses", 0])).toBe("tasks[3].bosses[0]");
  });
});

describe("shipped packs", () => {
  it("are all valid, including the examples", () => {
    const packs = loadPacks(path.resolve("packs"), { includeHidden: true });

    expect(packs.map((p) => p.folderName).sort()).toEqual([
      "aion2",
      "beispiel-rpg",
      "wow-forever",
    ]);
    for (const loaded of packs) {
      expect(loaded.errors, loaded.file).toEqual([]);
    }
  });

  it("leaves examples out of the regular load", () => {
    const packs = loadPacks(path.resolve("packs"), { includeHidden: false });

    expect(packs.map((p) => p.folderName)).not.toContain("beispiel-rpg");
  });
});
