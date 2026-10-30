import { describe, expect, it } from "vitest";
import { beastNodes, gatheredNodes } from "./gathering";

const ore = (de: string, en: string) => ({ de, en });

describe("gathering nodes from ForeverDB", () => {
  it("keeps nodes that give an item, once per item at its lowest skill", () => {
    // Arrange
    const items = new Map([
      ["Small Thorium Vein", ore("Thoriumerz", "Thorium Ore")],
      ["Rich Thorium Vein", ore("Thoriumerz", "Thorium Ore")],
      ["Copper Vein", ore("Kupfererz", "Copper Ore")],
    ]);

    // Act
    const nodes = gatheredNodes(
      [
        { name: "Rich Thorium Vein", skill: 275 },
        { name: "Small Thorium Vein", skill: 245 },
        { name: "Plant Bundle", skill: null },
        { name: "Copper Vein", skill: 1 },
      ],
      items,
    );

    // Assert
    expect(nodes).toEqual([
      { name: ore("Kupfererz", "Copper Ore"), skill: 1 },
      { name: ore("Thoriumerz", "Thorium Ore"), skill: 245 },
    ]);
  });

  it("lists each beast once with the lowest skill, easiest first", () => {
    // Act
    const nodes = beastNodes([
      { name: "Wetlands Crocolisk", skill: 120 },
      { name: "Young Black Bear", skill: 1 },
      { name: "Wetlands Crocolisk", skill: 110 },
    ]);

    // Assert
    expect(nodes).toEqual([
      { name: "Young Black Bear", skill: 1 },
      { name: "Wetlands Crocolisk", skill: 110 },
    ]);
  });
});
