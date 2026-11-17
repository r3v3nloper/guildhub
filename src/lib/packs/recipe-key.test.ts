import { describe, expect, it } from "vitest";
import { recipeKey, spellIdOfRecipeKey } from "./recipe-key";

describe("recipe keys", () => {
  it("round-trips profession and spell ID", () => {
    // Act
    const key = recipeKey("first-aid", 3275);

    // Assert
    expect(key).toBe("first-aid-3275");
    expect(spellIdOfRecipeKey(key, "first-aid")).toBe(3275);
  });

  it.each([
    ["a key of another profession", "alchemy-2330", "tailoring"],
    ["a hand-written key", "alchemy-elixier", "alchemy"],
  ])("finds no spell ID in %s", (_, key, profession) => {
    // Act
    const spellId = spellIdOfRecipeKey(key, profession);

    // Assert
    expect(spellId).toBeUndefined();
  });
});
