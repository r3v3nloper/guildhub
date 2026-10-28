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
        { name: "Mächtiger Heiltrank", notes: "nur eigene Kräuter" },
        { name: "Elixier des Riesen", notes: null },
        { name: "Feuer-Öl", notes: "Mats mitbringen" },
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
