import type { PackGathering } from "../src/lib/packs/schema";
import {
  API,
  fetchJson,
  localized,
  PAGE_SIZE,
  type ApiName,
} from "./foreverdb-api";

// Gathering guides from ForeverDB's /gathering: the best zones per skill range and what
// each zone offers. Zone names come from /zones, which knows the German ones.

const GATHERING_SLUGS = new Set(["herbalism", "mining", "skinning", "fishing"]);
/** Fishing lists every catch; the most likely ones are enough to choose a zone. */
const CATCHES_PER_ZONE = 5;

interface ApiZoneName extends ApiName {
  id: number;
}

interface ApiZoneRef {
  mapId: number;
  name: string;
}

interface ApiGathering {
  nodes?: Array<{ name: string; item: (ApiName & { itemId: number }) | null }>;
  zones: Array<
    ApiZoneRef & {
      nodes?: Array<{ name: string; skill: number | null }>;
      skill?: number | { min: number; max: number };
      loot?: Array<ApiName & { chance: number }>;
    }
  >;
  bestZones?: Array<{
    fromSkill: number;
    toSkill: number;
    zones: ApiZoneRef[];
  }>;
}

type LocalizedName = PackGathering["zones"][number]["name"];

async function zoneNames(key: string): Promise<Map<number, LocalizedName>> {
  const { data } = await fetchJson<{ data: ApiZoneName[] }>(
    key,
    `${API}/zones?lang=de&limit=${PAGE_SIZE}`,
  );
  return new Map(data.map((zone) => [zone.id, localized(zone)]));
}

function toGuide(
  profession: { id: string; name: unknown },
  data: ApiGathering,
  zones: ReadonlyMap<number, LocalizedName>,
): PackGathering {
  const zoneRef = (ref: ApiZoneRef) => ({
    map_id: ref.mapId,
    name: zones.get(ref.mapId) ?? ref.name,
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
    best_zones: (data.bestZones ?? []).map((range) => ({
      from_skill: range.fromSkill,
      to_skill: range.toSkill,
      zones: range.zones.map(zoneRef),
    })),
    zones: data.zones.map((zone) => ({
      ...zoneRef(zone),
      skill: typeof zone.skill === "number" ? zone.skill : zone.skill?.min,
      skill_max: typeof zone.skill === "object" ? zone.skill.max : undefined,
      nodes: (zone.nodes ?? []).map((node) => ({
        name: nodeItems.get(node.name) ?? node.name,
        skill: node.skill,
      })),
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
  const zones = await zoneNames(key);
  const guides: PackGathering[] = [];
  for (const profession of gathering) {
    const { data } = await fetchJson<{ data: ApiGathering }>(
      key,
      `${API}/gathering/${profession.id}?lang=de`,
    );
    guides.push(toGuide(profession, data, zones));
  }
  return guides;
}
