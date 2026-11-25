import { describe, expect, it } from "vitest";
import {
  bisListOf,
  compactBestInSlot,
  matchSpecs,
  professionIdsByName,
  type ApiBisList,
  type ApiBisSpec,
} from "./best-in-slot";

const classes = [
  { id: "warrior", name: { de: "Krieger", en: "Warrior" } },
  { id: "druid", name: { de: "Druide", en: "Druid" } },
];

const specs = [
  {
    id: "warrior-waffen",
    name: { de: "Waffen", en: "Arms" },
    class: "warrior",
  },
  {
    id: "druid-wildheit-katze",
    name: { de: "Wildheit (Katze)", en: "Feral (Cat)" },
    class: "druid",
  },
  {
    id: "druid-wildheit-baer",
    name: { de: "Wildheit (Bär)", en: "Feral (Bear)" },
    class: "druid",
  },
  {
    id: "druid-gleichgewicht",
    name: { de: "Gleichgewicht", en: "Balance" },
    class: "druid",
  },
];

const apiSpec = (id: string, className: string, spec: string): ApiBisSpec => ({
  id,
  class: className,
  spec,
});

const professionIds = professionIdsByName([
  { id: "enchanting", name: { de: "Verzauberkunst", en: "Enchanting" } },
]);

const apiList: ApiBisList = {
  mode: "pve",
  level: 60,
  weapons: "2h",
  url: "https://foreverdb.net/bis/warrior/arms",
  slots: [
    {
      slot: "chest",
      best: {
        itemId: 11726,
        name: "Wilde Brustplatte",
        nameEn: "Savage Gladiator Chain",
        quality: 4,
        itemLevel: 57,
        fromLevel: 52,
        percentBelowBest: 0,
        ease: "easy",
        seenInForever: true,
        url: "https://foreverdb.net/item/11726",
      },
      alternatives: [
        {
          itemId: 2,
          name: null,
          quality: 3,
          itemLevel: null,
          percentBelowBest: 4,
          ease: null,
          seenInForever: false,
          url: null,
        },
      ],
      enhancements: [
        {
          rank: 1,
          name: "Brust - Großartige Werte",
          nameEn: "Enchant Chest - Major Stats",
          kind: "enchant",
          effect: "All Stats +4",
          percentBelowBest: 0,
          hardToGet: [],
          profession: "Enchanting",
          skill: 300,
          spellId: 20025,
          itemId: null,
          materials: [
            { itemId: 14344, count: 4, name: "Großer glänzender Splitter" },
          ],
        },
        {
          rank: 2,
          name: "Arkanum",
          kind: "arcanum",
          effect: null,
          hardToGet: ["where it comes from isn't known yet"],
          profession: "Alchemy",
          materials: [],
        },
      ],
    },
    { slot: "off", best: null, alternatives: [], enhancements: [] },
  ],
};

describe("best in slot specs from ForeverDB", () => {
  it("pairs specs by class and spec name, Feral with both druid forms", () => {
    // Arrange
    const apiSpecs = [
      apiSpec("warrior-arms", "Warrior", "Arms"),
      apiSpec("druid-feral", "Druid", "Feral Combat"),
      apiSpec("druid-restoration", "Druid", "Restoration"),
    ];

    // Act
    const result = matchSpecs(apiSpecs, specs, classes);

    // Assert
    expect(result.matches.map((match) => [match.apiId, match.spec.id])).toEqual(
      [
        ["warrior-arms", "warrior-waffen"],
        ["druid-feral", "druid-wildheit-katze"],
        ["druid-feral", "druid-wildheit-baer"],
      ],
    );
    expect(result.unmatchedApi).toEqual(["druid-restoration"]);
    expect(result.unmatchedPack).toEqual(["druid-gleichgewicht"]);
  });

  it("does not pair a spec name of another class", () => {
    // Act
    const result = matchSpecs(
      [apiSpec("paladin-arms", "Paladin", "Arms")],
      specs,
      classes,
    );

    // Assert
    expect(result.matches).toEqual([]);
  });
});

describe("a best in slot list from ForeverDB", () => {
  it("keeps the pick, the alternatives and the ranked enchantments in pack form", () => {
    // Act
    const list = bisListOf(apiList, "pve", professionIds);

    // Assert
    expect(list).toMatchObject({
      mode: "pve",
      level: 60,
      weapons: "2h",
      link: "https://foreverdb.net/bis/warrior/arms",
    });
    expect(list.slots[0].best).toEqual({
      item: 11726,
      name: { de: "Wilde Brustplatte", en: "Savage Gladiator Chain" },
      quality: 4,
      item_level: 57,
      from_level: 52,
      percent_below_best: 0,
      ease: "easy",
      seen_in_forever: true,
      link: "https://foreverdb.net/item/11726",
    });
    expect(list.slots[0].enhancements[0]).toEqual({
      rank: 1,
      name: {
        de: "Brust - Großartige Werte",
        en: "Enchant Chest - Major Stats",
      },
      kind: "enchant",
      effect: "All Stats +4",
      percent_below_best: 0,
      hard_to_get: [],
      profession: "enchanting",
      skill: 300,
      spell: 20025,
      item: undefined,
      materials: [
        {
          name: {
            de: "Großer glänzender Splitter",
            en: "Großer glänzender Splitter",
          },
          count: 4,
          item: 14344,
        },
      ],
    });
  });

  it("leaves out what ForeverDB does not know, and a profession the pack lacks", () => {
    // Act
    const [chest, offHand] = bisListOf(apiList, "pve", professionIds).slots;

    // Assert
    expect(chest.alternatives[0]).toMatchObject({
      name: { de: "Unbekannter Gegenstand", en: "Unknown item" },
      item_level: undefined,
      ease: undefined,
      link: undefined,
    });
    expect(chest.enhancements[1]).toMatchObject({
      effect: undefined,
      profession: undefined,
      hard_to_get: ["where it comes from isn't known yet"],
    });
    expect(offHand.best).toBeNull();
  });

  it("writes no empty lists into pack.json, but keeps an empty slot", () => {
    // Arrange
    const list = bisListOf(apiList, "pvp", professionIds);

    // Act
    const entry = compactBestInSlot({
      id: "warrior-waffen",
      name: "Waffen",
      spec: "warrior-waffen",
      lists: [list],
      deprecated: false,
      replaces: [],
      todo: false,
    });

    // Assert
    expect(entry).not.toHaveProperty("replaces");
    expect(entry).not.toHaveProperty("deprecated");
    const [written] = entry.lists as Array<{ slots: object[] }>;
    expect(written.slots[1]).toEqual({ slot: "off", best: null });
    expect(
      (written.slots[0] as { enhancements: object[] }).enhancements[1],
    ).not.toHaveProperty("materials");
  });
});
