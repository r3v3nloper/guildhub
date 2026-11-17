import { describe, expect, it } from "vitest";
import { recipesForPack, type ApiRecipe } from "./recipes";

const recipe = (overrides: Partial<ApiRecipe>): ApiRecipe => ({
  spellId: 2963,
  name: "Leinenstoffballen",
  nameEn: "Bolt of Linen Cloth",
  skill: { orange: 1 },
  reagents: [{ name: null, count: 2, itemId: 2589 }],
  makes: { itemId: 2996 },
  learnedFrom: { recipeItems: [] },
  url: "https://foreverdb.net/spell/2963",
  leftoverOf: null,
  ...overrides,
});

describe("recipes from ForeverDB", () => {
  it("prefixes ids with the profession and drops leftover copies", () => {
    // Act
    const result = recipesForPack("tailoring", [
      recipe({}),
      recipe({ spellId: 439960, leftoverOf: 1250791 }),
    ]);

    // Assert
    expect(result).toEqual([
      expect.objectContaining({
        id: "tailoring-2963",
        name: { de: "Leinenstoffballen", en: "Bolt of Linen Cloth" },
        skill: 1,
        reagents: [
          {
            name: { de: "Unbekannter Gegenstand", en: "Unknown item" },
            count: 2,
            item: 2589,
          },
        ],
      }),
    ]);
  });

  it("keeps the item IDs of the product and of the recipe items", () => {
    // Arrange
    const plan = recipe({
      learnedFrom: { recipeItems: [{ itemId: 4345 }, { itemId: 4346 }] },
    });

    // Act
    const [result] = recipesForPack("tailoring", [plan]);

    // Assert
    expect(result.creates).toBe(2996);
    expect(result.recipe_items).toEqual([4345, 4346]);
  });

  it("leaves out the product of a recipe that makes no item", () => {
    // Act
    const [result] = recipesForPack("enchanting", [recipe({ makes: null })]);

    // Assert
    expect(result.creates).toBeUndefined();
  });
});
