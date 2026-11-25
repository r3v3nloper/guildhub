import { describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { gameCatalogEntries, guildGames } from "@/lib/db/schema";
import { NotFoundError } from "@/lib/errors";
import { validatePack } from "@/lib/packs/validate";
import { createGuildFixture } from "../../../test/fixtures/guild";
import {
  bestInSlotKey,
  bisListsOf,
  getSpecBestInSlot,
  slotsByGroup,
  specsWithBestInSlot,
  type BisSlot,
} from "./best-in-slot";

const item = (id: number, name: string, percent = 0) => ({
  item: id,
  name: { de: name, en: `${name} (en)` },
  quality: 4,
  percent_below_best: percent,
});

const chest = {
  slot: "chest",
  best: { ...item(1, "Brustplatte"), item_level: 60, ease: "hard" },
  alternatives: [item(2, "Kettenhemd", 5)],
  enhancements: [
    { rank: 2, name: "Geringe Werte", kind: "enchant", percent_below_best: 40 },
    {
      rank: 1,
      name: { de: "Großartige Werte", en: "Major Stats" },
      kind: "enchant",
      profession: "enchanting",
      skill: 300,
      materials: [{ name: { de: "Splitter", en: "Shard" }, count: 4 }],
    },
  ],
};

const pack = {
  id: "game",
  name: "Spiel",
  version: "1.0.0",
  capabilities: { classes: true, professions: true },
  classes: [{ id: "warrior", name: "Krieger", color: "#c69b6d" }],
  specs: [
    { id: "warrior-arms", name: "Waffen", class: "warrior", role: "melee" },
    { id: "warrior-fury", name: "Furor", class: "warrior", role: "melee" },
  ],
  professions: [
    { id: "enchanting", name: { de: "Verzauberkunst", en: "Enchanting" } },
  ],
  best_in_slot: [
    {
      id: "warrior-arms",
      name: "Waffen",
      spec: "warrior-arms",
      lists: [
        { mode: "pvp", level: 60, slots: [{ slot: "head", best: null }] },
        { mode: "pve", level: 60, weapons: "2h", slots: [chest] },
      ],
    },
  ],
};

function setUp() {
  const { db, actors } = createGuildFixture(pack, [{ discordId: "1001" }]);
  const specId = (key: string) =>
    db
      .select()
      .from(gameCatalogEntries)
      .where(
        and(
          eq(gameCatalogEntries.kind, "spec"),
          eq(gameCatalogEntries.key, key),
        ),
      )
      .get()!.id;
  return { db, actor: actors[0], specId };
}

describe("best in slot lists", () => {
  it("are localized, PvE first, with enchantments by rank and profession names", () => {
    // Arrange
    const parsed = validatePack(pack, "game").pack!;

    // Act
    const lists = bisListsOf(
      parsed.best_in_slot[0].lists,
      new Map([["enchanting", "Verzauberkunst"]]),
    );

    // Assert
    expect(lists.map((list) => list.mode)).toEqual(["pve", "pvp"]);
    const [slot] = lists[0].slots;
    expect(slot.best).toMatchObject({
      itemId: 1,
      name: "Brustplatte",
      itemLevel: 60,
      fromLevel: null,
      ease: "hard",
      link: null,
    });
    expect(slot.alternatives.map((alternative) => alternative.name)).toEqual([
      "Kettenhemd",
    ]);
    expect(slot.enhancements.map((enhancement) => enhancement.rank)).toEqual([
      1, 2,
    ]);
    expect(slot.enhancements[0]).toMatchObject({
      name: "Großartige Werte",
      profession: "Verzauberkunst",
      skill: 300,
      materials: [{ name: "Splitter", count: 4 }],
    });
    expect(slot.enhancements[1].profession).toBeNull();
  });

  it("are read for a spec of the guild's game, with its class and the game", () => {
    // Arrange
    const { db, actor, specId } = setUp();

    // Act
    const result = getSpecBestInSlot(db, actor, specId("warrior-arms"));

    // Assert
    expect(result.game.id).toBe("game");
    expect(result.classEntry?.key).toBe("warrior");
    expect(result.lists.map((list) => list.mode)).toEqual(["pve", "pvp"]);
    expect(result.lists[0].slots[0].enhancements[0].profession).toBe(
      "Verzauberkunst",
    );
  });

  it("are empty for a spec the pack has no list for", () => {
    // Arrange
    const { db, actor, specId } = setUp();

    // Act
    const result = getSpecBestInSlot(db, actor, specId("warrior-fury"));

    // Assert
    expect(result.spec.key).toBe("warrior-fury");
    expect(result.lists).toEqual([]);
  });

  it("are not found for an unknown spec or a game the guild has not enabled", () => {
    // Arrange
    const { db, actor, specId } = setUp();
    const arms = specId("warrior-arms");

    // Act & Assert
    expect(() => getSpecBestInSlot(db, actor, 9999)).toThrow(NotFoundError);
    db.update(guildGames).set({ enabled: false }).run();
    expect(() => getSpecBestInSlot(db, actor, arms)).toThrow(NotFoundError);
  });

  it("can be listed per spec without loading them", () => {
    // Arrange
    const { db } = setUp();

    // Act
    const withLists = specsWithBestInSlot(db, ["game"]);

    // Assert
    expect([...withLists]).toEqual([bestInSlotKey("game", "warrior-arms")]);
    expect(specsWithBestInSlot(db, [])).toEqual(new Set());
  });
});

describe("best in slot slot groups", () => {
  const slot = (name: string): BisSlot => ({
    slot: name,
    best: null,
    alternatives: [],
    enhancements: [],
  });

  it("put related slots together, keep the list order and leave out empty groups", () => {
    // Arrange
    const slots = ["head", "neck", "shoulder", "finger1", "main", "ranged"].map(
      slot,
    );

    // Act
    const groups = slotsByGroup(slots);

    // Assert
    expect(
      groups.map((entry) => [entry.group, entry.slots.map((s) => s.slot)]),
    ).toEqual([
      ["armor", ["head", "shoulder"]],
      ["jewelry", ["neck", "finger1"]],
      ["weapons", ["main", "ranged"]],
    ]);
  });

  it("collect slots the data source adds later at the end", () => {
    // Act
    const groups = slotsByGroup([slot("tabard"), slot("head")]);

    // Assert
    expect(groups.map((entry) => entry.group)).toEqual(["armor", "other"]);
  });
});
