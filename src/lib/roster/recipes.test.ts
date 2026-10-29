import { describe, expect, it } from "vitest";
import { formatRecipeLines, parseRecipeLines } from "./recipes";

describe("parseRecipeLines", () => {
  it("reads one recipe per line with an optional note after a spaced dash", () => {
    // Act
    const result = parseRecipeLines(
      "Mächtiger Heiltrank – nur eigene Kräuter\n\n  Elixier des Riesen  \nFeuer-Öl - Mats mitbringen",
    );

    // Assert
    expect(result).toEqual({
      ok: true,
      recipes: [
        {
          name: "Mächtiger Heiltrank",
          notes: "nur eigene Kräuter",
          recipeEntryId: null,
        },
        { name: "Elixier des Riesen", notes: null, recipeEntryId: null },
        { name: "Feuer-Öl", notes: "Mats mitbringen", recipeEntryId: null },
      ],
    });
  });

  it("round-trips through the text form", () => {
    // Arrange
    const text = "Mondstoff – alle 4 Tage\nRunenstoffbeutel";
    const parsed = parseRecipeLines(text);

    // Act
    const formatted = parsed.ok ? formatRecipeLines(parsed.recipes) : "";

    // Assert
    expect(formatted).toBe(text);
  });

  it("rejects a line without a name", () => {
    // Act
    const result = parseRecipeLines("– nur eine Notiz");

    // Assert
    expect(result.ok).toBe(false);
  });
});

describe("parseRecipeLines with known recipes", () => {
  const known = [
    {
      entryId: 1,
      name: "Elixier der Weisen",
      names: ["Elixier der Weisen", "Elixir of the Sages"],
    },
    { entryId: 2, name: "Elixier", names: ["Elixier", "Elixir"] },
    {
      entryId: 3,
      name: "Armschiene - Schwache Abwehr",
      names: ["Armschiene - Schwache Abwehr", "Enchant Bracer - Minor Deflect"],
    },
  ];

  it("links lines to the longest matching name and keeps the note", () => {
    // Act
    const result = parseRecipeLines(
      "elixir of the sages – nur Sonntags\nArmschiene - Schwache Abwehr\nElixierchen",
      known,
    );

    // Assert
    expect(result).toEqual({
      ok: true,
      recipes: [
        { name: "Elixier der Weisen", notes: "nur Sonntags", recipeEntryId: 1 },
        {
          name: "Armschiene - Schwache Abwehr",
          notes: null,
          recipeEntryId: 3,
        },
        { name: "Elixierchen", notes: null, recipeEntryId: null },
      ],
    });
  });

  it("keeps unknown lines as free text with their note", () => {
    // Act
    const result = parseRecipeLines("Geheimrezept – vom Onkel", known);

    // Assert
    expect(result).toEqual({
      ok: true,
      recipes: [
        { name: "Geheimrezept", notes: "vom Onkel", recipeEntryId: null },
      ],
    });
  });
});
