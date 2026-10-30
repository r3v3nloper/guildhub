import { and, eq, inArray } from "drizzle-orm";
import type { AppDatabase } from "@/lib/db/client";
import { gameCatalogEntries } from "@/lib/db/schema";
import type { PackGathering } from "@/lib/packs/schema";
import type { RosterCharacter } from "@/lib/roster/roster";
import { localize } from "@/i18n/localize";

export interface ZoneLink {
  name: string;
  /** Map page at the data source. */
  link: string | null;
}

export interface SkillRange {
  fromSkill: number;
  toSkill: number;
  zones: ZoneLink[];
}

export interface GuideZone extends ZoneLink {
  /** Fishing: skill the water needs; skinning: lowest skill of its beasts. */
  skill: number | null;
  skillMax: number | null;
  /** What grows or spawns there (skinning: the beasts) and from which skill, easiest first. */
  nodes: Array<{ name: string; skill: number | null }>;
  /** Fishing: the most likely catches. */
  catches: Array<{ name: string; chance: number }>;
}

/** Where a gathering profession pays off, from the pack (ForeverDB). */
export interface GatheringGuide {
  gameId: string;
  professionKey: string;
  professionName: string;
  /** Overview of the profession's nodes at the data source. */
  link: string | null;
  /** Best zones per skill range; empty for fishing, which ranks zones by their skill. */
  ranges: SkillRange[];
  zones: GuideZone[];
}

/** A member's gathering character with the zones that suit its skill now. */
export interface GatheringTip {
  characterName: string;
  gameId: string;
  professionKey: string;
  professionName: string;
  skill: number | null;
  /** Empty while no skill is entered. */
  zones: ZoneLink[];
}

const ZONES_PER_TIP = 3;

/** The guides of the games; read on their own because they are large (see game-catalog). */
export function loadGatheringGuides(
  db: AppDatabase,
  gameIds: readonly string[],
): GatheringGuide[] {
  if (gameIds.length === 0) {
    return [];
  }
  return db
    .select()
    .from(gameCatalogEntries)
    .where(
      and(
        inArray(gameCatalogEntries.gameId, [...gameIds]),
        eq(gameCatalogEntries.kind, "gathering"),
        eq(gameCatalogEntries.status, "active"),
      ),
    )
    .orderBy(gameCatalogEntries.id)
    .all()
    .map((entry) => toGuide(entry.gameId, localize(entry.name), entry.data));
}

function toGuide(
  gameId: string,
  professionName: string,
  data: Record<string, unknown>,
): GatheringGuide {
  const guide = data as Pick<
    PackGathering,
    "profession" | "link" | "best_zones" | "zones"
  >;
  const zoneLink = (zone: { name: PackGathering["name"]; link?: string }) => ({
    name: localize(zone.name),
    link: zone.link ?? null,
  });
  return {
    gameId,
    professionKey: guide.profession,
    professionName,
    link: guide.link ?? null,
    ranges: (guide.best_zones ?? []).map((range) => ({
      fromSkill: range.from_skill,
      toSkill: range.to_skill,
      zones: range.zones.map(zoneLink),
    })),
    zones: (guide.zones ?? [])
      .map((zone) => ({
        ...zoneLink(zone),
        skill: zone.skill ?? null,
        skillMax: zone.skill_max ?? null,
        nodes: (zone.nodes ?? [])
          .map((node) => ({ name: localize(node.name), skill: node.skill }))
          .sort((a, b) => (a.skill ?? 0) - (b.skill ?? 0)),
        catches: (zone.catches ?? []).map((item) => ({
          name: localize(item.name),
          chance: item.chance,
        })),
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

/**
 * The zones that suit a skill: the guide's range containing it (the top range beyond
 * its end), or for fishing the zones closest below the skill.
 */
export function zonesForSkill(
  guide: GatheringGuide,
  skill: number,
): ZoneLink[] {
  if (guide.ranges.length > 0) {
    // Ranges follow one another, lowest first.
    const range =
      guide.ranges.find((candidate) => skill < candidate.toSkill) ??
      guide.ranges.at(-1)!;
    return range.zones;
  }
  return guide.zones
    .filter((zone) => (zone.skill ?? 0) <= skill)
    .sort((a, b) => (b.skill ?? 0) - (a.skill ?? 0))
    .slice(0, ZONES_PER_TIP)
    .map(({ name, link }) => ({ name, link }));
}

/** One tip per gathering profession of the member's characters that a guide covers. */
export function gatheringTips(
  guides: readonly GatheringGuide[],
  characters: readonly RosterCharacter[],
): GatheringTip[] {
  const tips: GatheringTip[] = [];
  for (const character of characters) {
    for (const profession of character.professions) {
      const guide = guides.find(
        (candidate) =>
          candidate.gameId === character.gameId &&
          candidate.professionKey === profession.key,
      );
      if (!guide) {
        continue;
      }
      tips.push({
        characterName: character.name,
        gameId: character.gameId,
        professionKey: guide.professionKey,
        professionName: guide.professionName,
        skill: profession.skillLevel,
        zones:
          profession.skillLevel === null
            ? []
            : zonesForSkill(guide, profession.skillLevel),
      });
    }
  }
  return tips;
}
