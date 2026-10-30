import { describe, expect, it } from "vitest";
import { learningsByLevel, upcomingLearnings } from "./class-abilities";

const learnings = learningsByLevel([
  {
    name: { de: "Schlachtruf", en: "Battle Shout" },
    learned: "trainer",
    ranks: [
      { rank: 1, level: 1 },
      { rank: 2, level: 12 },
    ],
  },
  {
    name: { de: "Verteidigungshaltung", en: "Defensive Stance" },
    learned: "quest",
    ranks: [{ rank: null, level: 10 }],
  },
  {
    name: { de: "Blutrausch", en: "Bloodrage" },
    learned: "trainer",
    ranks: [{ rank: null, level: 10 }],
  },
]);

describe("class learnings", () => {
  it("groups every rank by its level, with German names and the quest ones marked", () => {
    // Assert
    expect(learnings).toEqual([
      {
        level: 1,
        learnings: [{ name: "Schlachtruf", rank: 1, fromQuest: false }],
      },
      {
        level: 10,
        learnings: [
          { name: "Blutrausch", rank: null, fromQuest: false },
          { name: "Verteidigungshaltung", rank: null, fromQuest: true },
        ],
      },
      {
        level: 12,
        learnings: [{ name: "Schlachtruf", rank: 2, fromQuest: false }],
      },
    ]);
  });

  it("shows the current level and the next ones that bring something", () => {
    // Act
    const atTen = upcomingLearnings(learnings, 10, 2);
    const atEleven = upcomingLearnings(learnings, 11);
    const atTop = upcomingLearnings(learnings, 60);

    // Assert
    expect(atTen.map((entry) => entry.level)).toEqual([10, 12]);
    expect(atEleven.map((entry) => entry.level)).toEqual([12]);
    expect(atTop).toEqual([]);
  });
});
