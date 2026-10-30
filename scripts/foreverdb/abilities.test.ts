import { describe, expect, it } from "vitest";
import {
  isTrainerAbility,
  knownAbilityNames,
  uniqueRanks,
  type ApiAbility,
} from "./abilities";

const ability = (overrides: Partial<ApiAbility>): ApiAbility => ({
  name: "Battle Shout",
  learned: "trainer",
  ranks: [
    { spellId: 6673, rank: "Rank 1", level: 1 },
    { spellId: 5242, rank: "Rank 2", level: 12 },
  ],
  ...overrides,
});

describe("trainer abilities from ForeverDB", () => {
  it("keeps what the trainer or a quest teaches", () => {
    // Act & Assert
    expect(isTrainerAbility(ability({}))).toBe(true);
    expect(isTrainerAbility(ability({ learned: "quest" }))).toBe(true);
    expect(isTrainerAbility(ability({ learned: "sod" }))).toBe(false);
    expect(isTrainerAbility(ability({ ranks: [] }))).toBe(false);
  });

  it("drops talents and pet skills: numbered ranks all at one level", () => {
    // Arrange
    const talent = ability({
      name: "Improved Pummel",
      ranks: [
        { spellId: 1, rank: "Rank 1", level: 1 },
        { spellId: 2, rank: "Rank 2", level: 1 },
      ],
    });
    const reincarnation = ability({
      name: "Reincarnation",
      ranks: [
        { spellId: 20608, rank: "", level: 30 },
        { spellId: 21169, rank: "", level: 30 },
      ],
    });

    // Act & Assert
    expect(isTrainerAbility(talent)).toBe(false);
    expect(isTrainerAbility(reincarnation)).toBe(true);
  });

  it("merges ranks that ForeverDB lists twice", () => {
    // Act
    const ranks = uniqueRanks([
      { rank: null, level: 30 },
      { rank: null, level: 30 },
      { rank: 2, level: 30 },
    ]);

    // Assert
    expect(ranks).toEqual([
      { rank: null, level: 30 },
      { rank: 2, level: 30 },
    ]);
  });

  it("remembers the German names the pack already has", () => {
    // Act
    const known = knownAbilityNames([
      {
        abilities: [
          { name: { de: "Schlachtruf", en: "Battle Shout" } },
          { name: "Frostfire Bolt" },
        ],
      },
    ]);

    // Assert
    expect([...known]).toEqual([
      ["Battle Shout", { de: "Schlachtruf", en: "Battle Shout" }],
    ]);
  });
});
