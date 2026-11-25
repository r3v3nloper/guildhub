import { describe, expect, it } from "vitest";
import { characterNameKey, matchCharacterName } from "./character-name";

describe("matchCharacterName", () => {
  it.each([
    ["Relitia Relikt", "Relitia Relikt", "exact"],
    ["Relitia Relikt", "  relitia   RELIKT ", "exact"],
    ["Thrall", "thrall", "exact"],
    ["Relitia Relikt", "Relitia", "firstName"],
    ["Relitia", "Relitia Relikt", "none"],
    ["Relitia Relikt", "Relitia Grau", "none"],
    ["Relitia Relikt", "Relikt", "none"],
  ] as const)("matches %s against %s as %s", (game, stored, expected) => {
    // Act
    const match = matchCharacterName(game, stored);

    // Assert
    expect(match).toBe(expected);
  });
});

describe("characterNameKey", () => {
  it("ignores case and spacing", () => {
    // Act
    const key = characterNameKey(" Relitia  Relikt");

    // Assert
    expect(key).toBe("relitia relikt");
  });
});
