import { describe, expect, it } from "vitest";
import { allowedClasses } from "./class-restrictions";

const classes = [
  { key: "warrior", factions: [] },
  { key: "paladin", factions: ["alliance"] },
  { key: "shaman", factions: ["horde"] },
];
const keys = (list: Array<{ key: string }>) => list.map((c) => c.key);

describe("allowedClasses", () => {
  it("offers everything when nothing is chosen yet", () => {
    expect(keys(allowedClasses(classes, undefined, undefined))).toEqual([
      "warrior",
      "paladin",
      "shaman",
    ]);
  });

  it("filters by a directly chosen faction", () => {
    expect(keys(allowedClasses(classes, undefined, "horde"))).toEqual([
      "warrior",
      "shaman",
    ]);
  });

  it("takes the faction from the race and applies the race's class list", () => {
    const orc = { faction: "horde", allowedClasses: ["warrior", "paladin"] };

    // Paladin passes the race list but not the race's faction.
    expect(keys(allowedClasses(classes, orc, "alliance"))).toEqual(["warrior"]);
  });

  it("treats an empty class list on the race as no restriction", () => {
    const human = { faction: "alliance", allowedClasses: [] };

    expect(keys(allowedClasses(classes, human, undefined))).toEqual([
      "warrior",
      "paladin",
    ]);
  });
});
