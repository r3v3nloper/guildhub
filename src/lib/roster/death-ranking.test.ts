import { describe, expect, it } from "vitest";
import { DEATH_RANKING_SIZE, rankByDeaths } from "./death-ranking";
import type { RosterCharacter, RosterMember } from "./roster";

let nextId = 1;
function character(name: string, deathCount: number | null): RosterCharacter {
  return {
    id: nextId++,
    gameId: "wow-forever",
    name,
    level: null,
    deathCount,
    spec: null,
    isMain: false,
    server: null,
    faction: null,
    race: null,
    characterClass: null,
    mainSpec: null,
    offSpec: null,
    role: null,
    professions: [],
    currentBuild: null,
    plannedClass: null,
  };
}

function member(name: string, characters: RosterCharacter[]): RosterMember {
  return {
    userId: name,
    name,
    image: null,
    role: "member",
    status: "active",
    characters,
  };
}

describe("rankByDeaths", () => {
  it("orders by deaths, then by name, across members", () => {
    // Arrange
    const members = [
      member("Anna", [character("Jaina", 2), character("Bolvar", 5)]),
      member("Ben", [character("Anduin", 2)]),
    ];

    // Act
    const ranks = rankByDeaths(members);

    // Assert
    expect(
      ranks.map((rank) => [
        rank.characterName,
        rank.memberName,
        rank.deathCount,
      ]),
    ).toEqual([
      ["Bolvar", "Anna", 5],
      ["Anduin", "Ben", 2],
      ["Jaina", "Anna", 2],
    ]);
  });

  it("leaves out characters without deaths and games that do not count them", () => {
    // Arrange
    const members = [
      member("Anna", [character("Jaina", 0), character("Aion-Held", null)]),
    ];

    // Act
    const ranks = rankByDeaths(members);

    // Assert
    expect(ranks).toEqual([]);
  });

  it("keeps only the top ten", () => {
    // Arrange
    const characters = Array.from({ length: DEATH_RANKING_SIZE + 2 }, (_, i) =>
      character(`Held ${String(i).padStart(2, "0")}`, i + 1),
    );

    // Act
    const ranks = rankByDeaths([member("Anna", characters)]);

    // Assert
    expect(ranks).toHaveLength(DEATH_RANKING_SIZE);
    expect(ranks[0].deathCount).toBe(DEATH_RANKING_SIZE + 2);
    expect(ranks.at(-1)?.deathCount).toBe(3);
  });
});
