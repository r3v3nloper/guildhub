import { describe, expect, it } from "vitest";
import { createListFixture } from "../../../test/fixtures/lists";
import type { RosterCharacter } from "@/lib/roster/roster";
import {
  gatheringTips,
  loadGatheringGuides,
  materialIndex,
  nextStep,
  zoneOffers,
  zonesForSkill,
  type GatheringGuide,
  type GuideZone,
} from "./gathering-guide";

const fishing: GatheringGuide = {
  gameId: "game",
  professionKey: "fishing",
  professionName: "Angeln",
  link: null,
  ranges: [],
  zones: [
    {
      name: "Durotar",
      skill: -20,
      skillMax: null,
      link: null,
      nodes: [],
      catches: [],
    },
    {
      name: "Brachland",
      skill: 20,
      skillMax: null,
      link: null,
      nodes: [],
      catches: [],
    },
    {
      name: "Sumpfland",
      skill: 55,
      skillMax: null,
      link: null,
      nodes: [],
      catches: [],
    },
    {
      name: "Tanaris",
      skill: 330,
      skillMax: null,
      link: null,
      nodes: [],
      catches: [],
    },
  ],
};

function character(name: string, skillLevel: number | null): RosterCharacter {
  return {
    id: 7,
    name,
    gameId: "game",
    characterClass: { color: "#c69b6d" },
    professions: [{ key: "mining", entryId: 3, skillLevel }],
  } as unknown as RosterCharacter;
}

function zone(name: string, overrides: Partial<GuideZone> = {}): GuideZone {
  return {
    name,
    link: null,
    skill: null,
    skillMax: null,
    nodes: [],
    catches: [],
    ...overrides,
  };
}

const herbalism: GatheringGuide = {
  gameId: "game",
  professionKey: "herbalism",
  professionName: "Kräuterkunde",
  link: null,
  ranges: [
    { fromSkill: 1, toSkill: 70, zones: [{ name: "Tirisfal", link: null }] },
    { fromSkill: 70, toSkill: 150, zones: [{ name: "Brachland", link: null }] },
    { fromSkill: 150, toSkill: 300, zones: [{ name: "Feralas", link: null }] },
  ],
  zones: [
    zone("Brachland", {
      nodes: [
        { name: "Friedensblume", skill: 1 },
        { name: "Königsblut", skill: 125 },
      ],
    }),
    zone("Feralas", { nodes: [{ name: "Friedensblume", skill: 1 }] }),
    zone("Tirisfal", { nodes: [{ name: "Friedensblume", skill: 1 }] }),
  ],
};

const westfall = { name: "Westfall", link: "https://example.org/maps/1436" };
const wetlands = { name: "Sumpfland", link: null };

describe("gathering guides", () => {
  it("loads the pack guides with zones and unique nodes, easiest first", () => {
    // Arrange
    const fixture = createListFixture();

    // Act
    const [guide] = loadGatheringGuides(fixture.db, ["game"]);

    // Assert
    expect(guide).toMatchObject({
      professionKey: "mining",
      professionName: "Bergbau",
      ranges: [
        { fromSkill: 1, toSkill: 66, zones: [westfall] },
        { fromSkill: 66, toSkill: 126, zones: [wetlands] },
      ],
    });
    // Each node once, at its lowest skill.
    expect(guide.zones[0].nodes).toEqual([
      { name: "Kupfererz", skill: 1 },
      { name: "Zinnerz", skill: 65 },
    ]);
  });

  it("picks the range of the skill, the top range beyond the last one", () => {
    // Arrange
    const [guide] = loadGatheringGuides(createListFixture().db, ["game"]);

    // Act & Assert
    expect(zonesForSkill(guide, 1)).toEqual([westfall]);
    expect(zonesForSkill(guide, 66)).toEqual([wetlands]);
    expect(zonesForSkill(guide, 300)).toEqual([wetlands]);
  });

  it("ranks fishing zones by the highest skill still within reach", () => {
    // Act & Assert
    expect(zonesForSkill(fishing, 60).map((zone) => zone.name)).toEqual([
      "Sumpfland",
      "Brachland",
      "Durotar",
    ]);
    expect(zonesForSkill(fishing, 1)).toEqual([
      { name: "Durotar", link: null },
    ]);
  });

  it("tips each gatherer, and asks for a skill where none is entered", () => {
    // Arrange
    const guides = loadGatheringGuides(createListFixture().db, ["game"]);

    // Act
    const tips = gatheringTips(guides, [
      character("Gimli", 80),
      character("Thorin", null),
    ]);

    // Assert
    expect(tips).toEqual([
      expect.objectContaining({
        characterName: "Gimli",
        skill: 80,
        zones: [wetlands],
      }),
      expect.objectContaining({ characterName: "Thorin", zones: [] }),
    ]);
  });

  it("points at the next range, or for fishing the next waters", () => {
    // Act & Assert
    expect(nextStep(herbalism, 80)).toEqual({
      skill: 150,
      zones: [{ name: "Feralas", link: null }],
    });
    expect(nextStep(herbalism, 200)).toBeNull();
    expect(nextStep(fishing, 30)).toEqual({
      skill: 55,
      zones: [{ name: "Sumpfland", link: null }],
    });
    expect(nextStep(fishing, 400)).toBeNull();
  });

  it("offers what the skill allows, then a few locked nodes", () => {
    // Arrange
    const brachland = herbalism.zones[0];

    // Act
    const offers = zoneOffers(brachland, 80);

    // Assert
    expect(offers).toEqual([
      { name: "Friedensblume", skill: 1, ready: true, chance: null },
      { name: "Königsblut", skill: 125, ready: false, chance: null },
    ]);
  });

  it("offers fishing catches once the water allows it", () => {
    // Arrange
    const water = zone("Sumpfland", {
      skill: 55,
      catches: [{ name: "Lachs", chance: 60 }],
    });

    // Act & Assert
    expect(zoneOffers(water, 40)).toEqual([
      { name: "Lachs", skill: 55, ready: false, chance: 60 },
    ]);
    expect(zoneOffers(water, 60)[0].ready).toBe(true);
  });

  it("tips with the range, the next step and what the zone offers", () => {
    // Act
    const [tip] = gatheringTips(
      [{ ...herbalism, professionKey: "mining" }],
      [character("Gimli", 80)],
    );

    // Assert
    expect(tip).toMatchObject({
      characterId: 7,
      professionEntryId: 3,
      classColor: "#c69b6d",
      range: { fromSkill: 70, toSkill: 150 },
      next: { skill: 150 },
      zones: [{ name: "Brachland" }],
    });
    expect(tip.offers.Brachland.map((offer) => offer.name)).toEqual([
      "Friedensblume",
      "Königsblut",
    ]);
  });

  it("puts the best ready nodes first and can show every locked one", () => {
    // Arrange
    const deep = zone("Feralas", {
      nodes: [
        { name: "A", skill: 1 },
        { name: "B", skill: 50 },
        { name: "C", skill: 200 },
        { name: "D", skill: 210 },
        { name: "E", skill: 220 },
        { name: "F", skill: 230 },
      ],
    });

    // Act
    const preview = zoneOffers(deep, 60);
    const all = zoneOffers(deep, 60, Infinity);

    // Assert
    expect(preview.map((offer) => offer.name)).toEqual([
      "B",
      "A",
      "C",
      "D",
      "E",
    ]);
    expect(all).toHaveLength(6);
  });

  it("indexes materials with their zones, recommended ones first", () => {
    // Act
    const index = materialIndex([herbalism, fishing]);

    // Assert
    expect(index.map((entry) => entry.name)).toEqual([
      "Friedensblume",
      "Königsblut",
    ]);
    // Skill 1 reaches the ranges up to 75: Tirisfal and Brachland, not Feralas.
    expect(index[0]).toMatchObject({
      professionName: "Kräuterkunde",
      skill: 1,
      zones: [
        { name: "Brachland", recommended: true },
        { name: "Tirisfal", recommended: true },
        { name: "Feralas", recommended: false },
      ],
    });
  });

  it("indexes fishing catches, likeliest first, but no skinning beasts", () => {
    // Arrange
    const water = (name: string, chance: number) =>
      zone(name, { skill: 20, catches: [{ name: "Lachs", chance }] });
    const skinning: GatheringGuide = {
      ...fishing,
      professionKey: "skinning",
      zones: [
        zone("Durotar", { skill: 1, nodes: [{ name: "Eber", skill: 1 }] }),
      ],
    };

    // Act
    const index = materialIndex([
      { ...fishing, zones: [water("Durotar", 10), water("Brachland", 40)] },
      skinning,
    ]);

    // Assert
    expect(index).toHaveLength(1);
    expect(index[0].zones.map((entry) => entry.name)).toEqual([
      "Brachland",
      "Durotar",
    ]);
  });
});
