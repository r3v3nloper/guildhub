import { and, eq, inArray } from "drizzle-orm";
import type { AppDatabase } from "@/lib/db/client";
import { gameCatalogEntries } from "@/lib/db/schema";
import type { PackGathering } from "@/lib/packs/schema";
import type { RosterCharacter } from "@/lib/roster/roster";
import { localize } from "@/i18n/localize";
import { zoneOffers, type GatheringOffer } from "./gathering-offers";

export { zoneOffers, type GatheringOffer };

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
  characterId: number;
  characterName: string;
  classColor: string | null;
  gameId: string;
  professionKey: string;
  /** The catalog entry, for saving the skill. */
  professionEntryId: number;
  professionName: string;
  skill: number | null;
  /** Empty while no skill is entered. */
  zones: ZoneLink[];
  /** The skill range the zones are for; null for fishing and without a skill. */
  range: { fromSkill: number; toSkill: number } | null;
  /** Where to go once the skill grows past these zones; null at the top. */
  next: { skill: number; zones: ZoneLink[] } | null;
  /**
   * What each of the zones offers, by zone name: all the skill allows, then a few still
   * locked. Zones the guide knows nothing more about are missing.
   */
  offers: Record<string, GatheringOffer[]>;
}

/** A material a guide knows, with every zone it is found in. */
export interface MaterialEntry {
  /** Unique across games and professions. */
  key: string;
  name: string;
  gameId: string;
  professionKey: string;
  professionName: string;
  /** The lowest skill that gathers it anywhere; null where the data has none. */
  skill: number | null;
  /** Recommended zones first, then the likeliest catches, then by name. */
  zones: Array<
    ZoneLink & {
      /** One of the best zones while the material is within the skill's reach. */
      recommended: boolean;
      chance: number | null;
    }
  >;
}

const ZONES_PER_TIP = 3;
/**
 * A material counts as at home in the best zones of the ranges up to this far above
 * the skill it needs: that is where it is gathered while levelling.
 */
const MATERIAL_WINDOW = 75;

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
        nodes: uniqueByName(
          (zone.nodes ?? [])
            .map((node) => ({ name: localize(node.name), skill: node.skill }))
            .sort((a, b) => (a.skill ?? 0) - (b.skill ?? 0)),
        ),
        catches: (zone.catches ?? []).map((item) => ({
          name: localize(item.name),
          chance: item.chance,
        })),
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

/**
 * Each name once, at its first (lowest) skill: a small and a rich vein both give
 * "Thoriumerz", and two chips with the same name only confuse.
 */
function uniqueByName<T extends { name: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.name)) {
      return false;
    }
    seen.add(item.name);
    return true;
  });
}

/** The range containing the skill (the top range beyond its end); null for fishing. */
function rangeFor(guide: GatheringGuide, skill: number): SkillRange | null {
  // Ranges follow one another, lowest first.
  return (
    guide.ranges.find((candidate) => skill < candidate.toSkill) ??
    guide.ranges.at(-1) ??
    null
  );
}

/**
 * The zones that suit a skill: the guide's range containing it (the top range beyond
 * its end), or for fishing the zones closest below the skill.
 */
export function zonesForSkill(
  guide: GatheringGuide,
  skill: number,
): ZoneLink[] {
  const range = rangeFor(guide, skill);
  if (range) {
    return range.zones;
  }
  return guide.zones
    .filter((zone) => (zone.skill ?? 0) <= skill)
    .sort((a, b) => (b.skill ?? 0) - (a.skill ?? 0))
    .slice(0, ZONES_PER_TIP)
    .map(({ name, link }) => ({ name, link }));
}

/** Where the next step up leads: the following range, or for fishing the next waters. */
export function nextStep(
  guide: GatheringGuide,
  skill: number,
): GatheringTip["next"] {
  const range = rangeFor(guide, skill);
  if (range) {
    const following = guide.ranges[guide.ranges.indexOf(range) + 1];
    return following
      ? { skill: following.fromSkill, zones: following.zones }
      : null;
  }
  const ahead = guide.zones.filter((zone) => (zone.skill ?? 0) > skill);
  if (ahead.length === 0) {
    return null;
  }
  const nextSkill = Math.min(...ahead.map((zone) => zone.skill ?? 0));
  return {
    skill: nextSkill,
    zones: ahead
      .filter((zone) => zone.skill === nextSkill)
      .slice(0, ZONES_PER_TIP)
      .map(({ name, link }) => ({ name, link })),
  };
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
      const skill = profession.skillLevel;
      const zones = skill === null ? [] : zonesForSkill(guide, skill);
      const range = skill === null ? null : rangeFor(guide, skill);
      const offers: GatheringTip["offers"] = {};
      for (const link of zones) {
        const zone = guide.zones.find((known) => known.name === link.name);
        if (zone && skill !== null) {
          offers[zone.name] = zoneOffers(zone, skill);
        }
      }
      tips.push({
        characterId: character.id,
        characterName: character.name,
        classColor: character.characterClass?.color ?? null,
        gameId: character.gameId,
        professionKey: guide.professionKey,
        professionEntryId: profession.entryId,
        professionName: guide.professionName,
        skill,
        zones,
        range: range && { fromSkill: range.fromSkill, toSkill: range.toSkill },
        next: skill === null ? null : nextStep(guide, skill),
        offers,
      });
    }
  }
  return tips;
}

/**
 * Every material the guides know, for looking one up: herbs and ores from the nodes,
 * fish from the catches. Skinning lists beasts, not materials, so it stays out; its
 * zones are the ones with a skill of their own (see GuideZone).
 */
export function materialIndex(
  guides: readonly GatheringGuide[],
): MaterialEntry[] {
  const entries = new Map<string, MaterialEntry>();
  for (const guide of guides) {
    for (const zone of guide.zones) {
      const found =
        zone.skill === null
          ? zone.nodes.map((node) => ({ ...node, chance: null }))
          : zone.catches.map((item) => ({ ...item, skill: zone.skill }));
      for (const item of found) {
        const key = `${guide.gameId}:${guide.professionKey}:${item.name}`;
        const entry = entries.get(key) ?? {
          key,
          name: item.name,
          gameId: guide.gameId,
          professionKey: guide.professionKey,
          professionName: guide.professionName,
          skill: item.skill,
          zones: [],
        };
        entries.set(key, entry);
        if (
          item.skill !== null &&
          (entry.skill === null || item.skill < entry.skill)
        ) {
          entry.skill = item.skill;
        }
        if (!entry.zones.some((known) => known.name === zone.name)) {
          entry.zones.push({
            name: zone.name,
            link: zone.link,
            recommended: false,
            chance: item.chance,
          });
        }
      }
    }
  }
  return [...entries.values()]
    .map((entry) => {
      const guide = guides.find(
        (candidate) =>
          candidate.gameId === entry.gameId &&
          candidate.professionKey === entry.professionKey,
      )!;
      const from = entry.skill ?? 0;
      const recommended = new Set(
        guide.ranges
          .filter(
            (range) =>
              range.toSkill > from && range.fromSkill < from + MATERIAL_WINDOW,
          )
          .flatMap((range) => range.zones.map((zone) => zone.name)),
      );
      return {
        ...entry,
        zones: entry.zones
          .map((zone) => ({ ...zone, recommended: recommended.has(zone.name) }))
          .sort(
            (a, b) =>
              Number(b.recommended) - Number(a.recommended) ||
              (b.chance ?? 0) - (a.chance ?? 0) ||
              a.name.localeCompare(b.name),
          ),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
