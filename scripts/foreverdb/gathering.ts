import type { PackGathering } from "../../src/lib/packs/schema";
import { API, fetchJson, localized, PAGE_SIZE, type ApiName } from "./api";

// Gathering guides from ForeverDB's /gathering: the best zones per skill range and what
// each zone offers. Zone names and map links come from /zones, which knows the German
// names. Skinning lists its beasts only per zone, which costs one request per zone.

const GATHERING_SLUGS = new Set(["herbalism", "mining", "skinning", "fishing"]);
/** Fishing lists every catch; the most likely ones are enough to choose a zone. */
const CATCHES_PER_ZONE = 5;

interface ApiZoneName extends ApiName {
  id: number;
  url: string;
}

export interface ApiBeast {
  /** Creature names stay English in the API. */
  name: string;
  skill: number;
}

interface ApiZoneRef {
  mapId: number;
  name: string;
}

export interface ApiGathering {
  url: string;
  nodes?: Array<{ name: string; item: (ApiName & { itemId: number }) | null }>;
  zones: Array<
    ApiZoneRef & {
      nodes?: Array<{ name: string; skill: number | null }>;
      skill?: number | { min: number; max: number };
      loot?: Array<ApiName & { chance: number }>;
      beasts?: ApiBeast[];
    }
  >;
  bestZones?: Array<{
    fromSkill: number;
    toSkill: number;
    zones: ApiZoneRef[];
  }>;
}

type GuideZone = PackGathering["zones"][number];
type ZoneInfo = Pick<GuideZone, "name" | "link">;
type Node = GuideZone["nodes"][number];

async function zoneInfo(key: string): Promise<Map<number, ZoneInfo>> {
  const { data } = await fetchJson<{ data: ApiZoneName[] }>(
    key,
    `${API}/zones?lang=de&limit=${PAGE_SIZE}`,
  );
  return new Map(
    data.map((zone) => [zone.id, { name: localized(zone), link: zone.url }]),
  );
}

/** Each beast kind once, with the lowest skill any of them needs, easiest first. */
export function beastNodes(beasts: readonly ApiBeast[]): Node[] {
  const skills = new Map<string, number>();
  for (const beast of beasts) {
    skills.set(
      beast.name,
      Math.min(skills.get(beast.name) ?? Infinity, beast.skill),
    );
  }
  return [...skills]
    .map(([name, skill]) => ({ name, skill }))
    .sort((a, b) => a.skill - b.skill || a.name.localeCompare(b.name));
}

async function skinningBeasts(
  key: string,
  mapIds: readonly number[],
): Promise<Map<number, Node[]>> {
  const beasts = new Map<number, Node[]>();
  for (const mapId of mapIds) {
    const { data } = await fetchJson<{ data: ApiGathering }>(
      key,
      `${API}/gathering/skinning?zone=${mapId}`,
    );
    beasts.set(mapId, beastNodes(data.zones[0]?.beasts ?? []));
  }
  return beasts;
}

/**
 * The zone's nodes by what they give. Objects without an item ("Plant Bundle", quest
 * herbs like "Gloom Weed") are no gathering nodes and stay out; nodes giving the same
 * item (a small and a rich thorium vein) count once, at the lowest skill.
 */
export function gatheredNodes(
  nodes: ApiGathering["zones"][number]["nodes"],
  nodeItems: ReadonlyMap<string, Node["name"]>,
): Node[] {
  const byItem = new Map<string, Node>();
  for (const node of nodes ?? []) {
    const name = nodeItems.get(node.name);
    if (!name) {
      continue;
    }
    const key = typeof name === "string" ? name : JSON.stringify(name);
    const known = byItem.get(key);
    if (!known || (node.skill ?? 0) < (known.skill ?? 0)) {
      byItem.set(key, { name, skill: node.skill });
    }
  }
  return [...byItem.values()].sort((a, b) => (a.skill ?? 0) - (b.skill ?? 0));
}

function toGuide(
  profession: { id: string; name: unknown },
  data: ApiGathering,
  zones: ReadonlyMap<number, ZoneInfo>,
  beasts: ReadonlyMap<number, Node[]> = new Map(),
): PackGathering {
  const zoneRef = (ref: ApiZoneRef) => ({
    map_id: ref.mapId,
    name: zones.get(ref.mapId)?.name ?? ref.name,
    link: zones.get(ref.mapId)?.link,
  });
  // Nodes ("Copper Vein") are named after what they give ("Kupfererz"), which ForeverDB
  // has in German.
  const nodeItems = new Map(
    (data.nodes ?? [])
      .filter((node) => node.item !== null)
      .map((node) => [node.name, localized(node.item!)]),
  );
  return {
    id: profession.id,
    name: profession.name as PackGathering["name"],
    profession: profession.id,
    link: data.url,
    best_zones: (data.bestZones ?? []).map((range) => ({
      from_skill: range.fromSkill,
      to_skill: range.toSkill,
      zones: range.zones.map(zoneRef),
    })),
    zones: data.zones.map((zone) => ({
      ...zoneRef(zone),
      skill: typeof zone.skill === "number" ? zone.skill : zone.skill?.min,
      skill_max: typeof zone.skill === "object" ? zone.skill.max : undefined,
      nodes: beasts.get(zone.mapId) ?? gatheredNodes(zone.nodes, nodeItems),
      catches: [...(zone.loot ?? [])]
        .sort((a, b) => b.chance - a.chance)
        .slice(0, CATCHES_PER_ZONE)
        .map((item) => ({ name: localized(item), chance: item.chance })),
    })),
    deprecated: false,
    replaces: [],
    todo: false,
  };
}

/** One guide per gathering profession the pack lists. */
export async function gatheringOf(
  key: string,
  professions: ReadonlyArray<{ id: string; name: unknown }>,
): Promise<PackGathering[]> {
  const gathering = professions.filter((p) => GATHERING_SLUGS.has(p.id));
  if (gathering.length === 0) {
    return [];
  }
  const zones = await zoneInfo(key);
  const guides: PackGathering[] = [];
  for (const profession of gathering) {
    const { data } = await fetchJson<{ data: ApiGathering }>(
      key,
      `${API}/gathering/${profession.id}?lang=de`,
    );
    const beasts =
      profession.id === "skinning"
        ? await skinningBeasts(
            key,
            data.zones.map((zone) => zone.mapId),
          )
        : undefined;
    guides.push(toGuide(profession, data, zones, beasts));
  }
  return guides;
}
