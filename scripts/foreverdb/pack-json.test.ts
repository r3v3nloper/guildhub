import { describe, expect, it } from "vitest";
import { compact, withKeyAfter } from "./pack-json";

describe("pack.json output", () => {
  it("drops undefined fields, empty lists and false lifecycle flags", () => {
    // Act
    const result = compact({
      id: "x",
      skill: undefined,
      reagents: [],
      bosses: [],
      deprecated: false,
      todo: true,
    });

    // Assert
    expect(result).toEqual({ id: "x", bosses: [], todo: true });
  });

  it("puts a key after another, replacing it where it was", () => {
    // Act
    const result = withKeyAfter(
      { a: 1, recipes: [1], b: 2 },
      "a",
      "recipes",
      [2],
    );

    // Assert
    expect(Object.entries(result)).toEqual([
      ["a", 1],
      ["recipes", [2]],
      ["b", 2],
    ]);
  });
});
