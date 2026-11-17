import type { RosterMember } from "./roster";

export const DEATH_RANKING_SIZE = 10;

export interface DeathRank {
  characterId: number;
  characterName: string;
  memberName: string | null;
  gameId: string;
  deathCount: number;
}

/** "Die meisten Tode" (SPEC 7.4): characters with at least one death, most first. */
export function rankByDeaths(members: RosterMember[]): DeathRank[] {
  return members
    .flatMap((member) =>
      member.characters.map((character) => ({
        characterId: character.id,
        characterName: character.name,
        memberName: member.name,
        gameId: character.gameId,
        deathCount: character.deathCount ?? 0,
      })),
    )
    .filter((rank) => rank.deathCount > 0)
    .sort(
      (a, b) =>
        b.deathCount - a.deathCount ||
        a.characterName.localeCompare(b.characterName),
    )
    .slice(0, DEATH_RANKING_SIZE);
}
