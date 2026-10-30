import { describe, expect, it } from "vitest";
import { createListFixture } from "../../../test/fixtures/lists";
import type { RosterCharacter } from "@/lib/roster/roster";
import {
  gatheringTips,
  loadGatheringGuides,
  zonesForSkill,
  type GatheringGuide,
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
    name,
    gameId: "game",
    professions: [{ key: "mining", skillLevel }],
  } as unknown as RosterCharacter;
}

const westfall = { name: "Westfall", link: "https://example.org/maps/1436" };
const wetlands = { name: "Sumpfland", link: null };

describe("gathering guides", () => {
  it("loads the pack guides with zones and nodes, easiest first", () => {
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
    expect(guide.zones[0].nodes.map((node) => node.name)).toEqual([
      "Kupfererz",
      "Zinnerz",
    ]);
  });

  it("picks the range of the skill, the top range beyond the last one", () => {
    // Arrange
    const [guide] = loadGatheringGuides(createListFixture().db, ["game"]);

    // Act & Assert
    expect(zonesForSkill(guide, 1)).toEqual(["Westfall"]);
    expect(zonesForSkill(guide, 66)).toEqual(["Sumpfland"]);
    expect(zonesForSkill(guide, 300)).toEqual(["Sumpfland"]);
  });

  it("ranks fishing zones by the highest skill still within reach", () => {
    // Act & Assert
    expect(zonesForSkill(fishing, 60)).toEqual([
      "Sumpfland",
      "Brachland",
      "Durotar",
    ]);
    expect(zonesForSkill(fishing, 1)).toEqual(["Durotar"]);
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
        zones: ["Sumpfland"],
      }),
      expect.objectContaining({ characterName: "Thorin", zones: [] }),
    ]);
  });
});
