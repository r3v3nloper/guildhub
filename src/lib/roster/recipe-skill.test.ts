import { describe, expect, it } from "vitest";
import { learnableAt } from "./recipe-skill";

describe("learnableAt", () => {
  const recipes = [
    { name: "Leinenverband", skill: 1 },
    { name: "Seidenverband", skill: 150 },
    { name: "Geheimrezept", skill: null },
  ];

  it("offers only recipes up to the entered skill", () => {
    // Act
    const result = learnableAt(recipes, 1);

    // Assert
    expect(result.map((r) => r.name)).toEqual(["Leinenverband"]);
  });

  it("includes a recipe learnable exactly at the skill, but none without a skill", () => {
    // Act
    const result = learnableAt(recipes, 150);

    // Assert
    expect(result.map((r) => r.name)).toEqual([
      "Leinenverband",
      "Seidenverband",
    ]);
  });

  it("offers everything while no skill is entered", () => {
    // Act & Assert
    expect(learnableAt(recipes, null)).toHaveLength(3);
  });
});
