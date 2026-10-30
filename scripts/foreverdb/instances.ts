import type { PackInstance } from "../../src/lib/packs/schema";
import { API, fetchJson, PAGE_SIZE } from "./api";

// Dungeons and raids from ForeverDB's /dungeons, with bosses and notable loot.

interface ApiInstanceSummary {
  id: number;
  name: string;
  /** classic and forever are in WoW Forever; other is Season of Discovery content. */
  status: "classic" | "forever" | "other";
}

export interface ApiInstance extends ApiInstanceSummary {
  kind: "dungeon" | "raid";
  players: number | null;
  levelRange: [number, number] | null;
  bosses: string[];
  notableLoot: Array<{ itemId: number; name: string; why: string[] }>;
}

const FOREVER_STATUSES = new Set(["classic", "forever"]);

export function slugOf(name: string): string {
  return name
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * ForeverDB names instances only in English. A German name kept by hand in the pack
 * survives every import; the English one follows the API.
 */
export function instanceName(
  apiName: string,
  kept: unknown,
): PackInstance["name"] {
  const german =
    kept && typeof kept === "object" && "de" in kept ? kept.de : undefined;
  return typeof german === "string" ? { de: german, en: apiName } : apiName;
}

function toPackInstance(
  id: string,
  data: ApiInstance,
  keptName: unknown,
): PackInstance {
  return {
    id,
    name: instanceName(data.name, keptName),
    kind: data.kind,
    players: data.players ?? undefined,
    level_min: data.levelRange?.[0],
    level_max: data.levelRange?.[1],
    bosses: data.bosses,
    loot: data.notableLoot.map((item) => ({
      name: item.name,
      reason: item.why.length > 0 ? item.why.join("; ") : undefined,
      link: `https://foreverdb.net/item/${item.itemId}`,
    })),
    deprecated: false,
    replaces: [],
    todo: false,
  };
}

/**
 * The instances of WoW Forever that have bosses, lowest level first; instances without
 * any are not in the game (yet) and would make empty templates.
 */
export function instancesForPack(
  instances: readonly ApiInstance[],
  keptNames: ReadonlyMap<string, unknown>,
): PackInstance[] {
  const result: PackInstance[] = [];
  const ids = new Set<string>();
  for (const data of instances) {
    if (!FOREVER_STATUSES.has(data.status) || data.bosses.length === 0) {
      continue;
    }
    // Names are unique so far; the ForeverDB id keeps a future clash apart.
    const slug = slugOf(data.name);
    const id = ids.has(slug) ? `${slug}-${data.id}` : slug;
    ids.add(id);
    result.push(toPackInstance(id, data, keptNames.get(id)));
  }
  return result.sort(
    (a, b) =>
      (a.level_min ?? Infinity) - (b.level_min ?? Infinity) ||
      a.id.localeCompare(b.id),
  );
}

export async function instancesOf(
  key: string,
  keptNames: ReadonlyMap<string, unknown>,
): Promise<PackInstance[]> {
  const list = await fetchJson<{ data: ApiInstanceSummary[] }>(
    key,
    `${API}/dungeons?limit=${PAGE_SIZE}`,
  );
  const details: ApiInstance[] = [];
  // Season of Discovery instances are skipped before their detail request.
  for (const summary of list.data.filter((entry) =>
    FOREVER_STATUSES.has(entry.status),
  )) {
    const { data } = await fetchJson<{ data: ApiInstance }>(
      key,
      `${API}/dungeons/${summary.id}`,
    );
    details.push(data);
  }
  return instancesForPack(details, keptNames);
}
