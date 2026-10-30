import fs from "node:fs";
import path from "node:path";
import { packsDirectory, PACK_FILE_NAME } from "../src/lib/packs/loader";
import type { PackInstance, PackRecipe } from "../src/lib/packs/schema";
import {
  API,
  apiKey,
  fetchJson,
  localized,
  PAGE_SIZE,
  type ApiName,
} from "./foreverdb-api";
import { gatheringOf } from "./foreverdb-gathering";

// Pulls the recipes and gathering guides of the pack's professions and the dungeons and
// raids from the ForeverDB API into pack.json, so the app itself never needs the API key
// or a connection to ForeverDB at runtime.
// Usage: npm run packs:foreverdb [-- <pack-id>]   (needs FOREVERDB_API_KEY, e.g. in .env.local)

const CREDIT = {
  label: "Data from ForeverDB.net",
  url: "https://foreverdb.net",
};
interface ApiRecipe extends ApiName {
  spellId: number;
  skill: { orange: number | null } | null;
  reagents: Array<ApiName & { count: number }>;
  url: string;
  /** Set on a leftover copy of another recipe with the same name. */
  leftoverOf: number | null;
}

interface ApiRecipePage {
  data: { recipes: ApiRecipe[] };
  meta: { next: string | null; build: string };
}

interface ApiInstanceSummary {
  id: number;
  name: string;
  /** classic and forever are in WoW Forever; other is Season of Discovery content. */
  status: "classic" | "forever" | "other";
}

interface ApiInstance extends ApiInstanceSummary {
  kind: "dungeon" | "raid";
  players: number | null;
  levelRange: [number, number] | null;
  bosses: string[];
  notableLoot: Array<{ itemId: number; name: string; why: string[] }>;
}

const FOREVER_STATUSES = new Set(["classic", "forever"]);

function toPackRecipe(professionId: string, recipe: ApiRecipe): PackRecipe {
  return {
    // A few recipes belong to two professions, so the spell ID alone is not unique.
    id: `${professionId}-${recipe.spellId}`,
    name: localized(recipe),
    profession: professionId,
    skill: recipe.skill?.orange ?? undefined,
    link: recipe.url,
    reagents: recipe.reagents.map((reagent) => ({
      name: localized(reagent),
      count: reagent.count,
    })),
    deprecated: false,
    replaces: [],
    todo: false,
  };
}

async function recipesOf(key: string, professionId: string) {
  const recipes: PackRecipe[] = [];
  let url: string | null =
    `${API}/professions/${professionId}?lang=de&limit=${PAGE_SIZE}`;
  let build = "";
  while (url) {
    const page: ApiRecipePage = await fetchJson<ApiRecipePage>(key, url);
    // Leftover copies (Season of Discovery items) cannot be learned in Forever.
    recipes.push(
      ...page.data.recipes
        .filter((recipe) => recipe.leftoverOf === null)
        .map((recipe) => toPackRecipe(professionId, recipe)),
    );
    build = page.meta.build;
    url = page.meta.next ? new URL(page.meta.next, API).toString() : null;
  }
  return { recipes, build };
}

function slugOf(name: string): string {
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
function instanceName(apiName: string, kept: unknown): PackInstance["name"] {
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
 * Dungeons and raids of WoW Forever that have bosses; instances without any are not in
 * the game (yet) and would make empty templates.
 */
async function instancesOf(
  key: string,
  keptNames: ReadonlyMap<string, unknown>,
): Promise<PackInstance[]> {
  const list = await fetchJson<{ data: ApiInstanceSummary[] }>(
    key,
    `${API}/dungeons?limit=${PAGE_SIZE}`,
  );
  const instances: PackInstance[] = [];
  const ids = new Set<string>();
  for (const summary of list.data) {
    if (!FOREVER_STATUSES.has(summary.status)) {
      continue;
    }
    const { data } = await fetchJson<{ data: ApiInstance }>(
      key,
      `${API}/dungeons/${summary.id}`,
    );
    if (data.bosses.length === 0) {
      continue;
    }
    // Names are unique so far; the ForeverDB id keeps a future clash apart.
    const slug = slugOf(data.name);
    const id = ids.has(slug) ? `${slug}-${data.id}` : slug;
    ids.add(id);
    instances.push(toPackInstance(id, data, keptNames.get(id)));
  }
  return instances.sort(
    (a, b) =>
      (a.level_min ?? Infinity) - (b.level_min ?? Infinity) ||
      a.id.localeCompare(b.id),
  );
}

/**
 * Keeps pack.json readable: no default-valued lifecycle fields, no empty lists, no
 * undefined fields.
 */
function compact(entry: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(entry).filter(([key, value]) => {
      if (value === undefined) {
        return false;
      }
      if (Array.isArray(value)) {
        return value.length > 0 || key === "bosses";
      }
      return !(["deprecated", "todo"].includes(key) && value === false);
    }),
  );
}

/** Inserts `value` under `key` right after `afterKey`, keeping the file's key order. */
function withKeyAfter(
  object: Record<string, unknown>,
  afterKey: string,
  key: string,
  value: unknown,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [existingKey, existingValue] of Object.entries(object)) {
    if (existingKey === key) {
      continue;
    }
    result[existingKey] = existingValue;
    if (existingKey === afterKey) {
      result[key] = value;
    }
  }
  if (!(key in result)) {
    result[key] = value;
  }
  return result;
}

async function main() {
  const packId = process.argv[2] ?? "wow-forever";
  const file = path.join(packsDirectory(), packId, PACK_FILE_NAME);
  const pack = JSON.parse(fs.readFileSync(file, "utf8")) as Record<
    string,
    unknown
  > & {
    professions: Array<{ id: string; name: unknown }>;
    instances?: Array<{ id: string; name: unknown }>;
  };
  const key = apiKey();

  const recipes: Array<Record<string, unknown>> = [];
  for (const profession of pack.professions) {
    const result = await recipesOf(key, profession.id);
    console.log(
      `${profession.id}: ${result.recipes.length} Rezepte (Build ${result.build})`,
    );
    recipes.push(...result.recipes.map((recipe) => compact({ ...recipe })));
  }
  const keptNames = new Map(
    (pack.instances ?? []).map((instance) => [instance.id, instance.name]),
  );
  const instances = (await instancesOf(key, keptNames)).map((instance) =>
    compact({
      ...instance,
      loot: instance.loot.map((item) => compact({ ...item })),
    }),
  );
  console.log(`${instances.length} Dungeons und Raids`);
  const gathering = (await gatheringOf(key, pack.professions)).map((guide) =>
    compact({
      ...guide,
      zones: guide.zones.map((zone) => compact({ ...zone })),
    }),
  );
  console.log(`${gathering.length} Sammel-Wegweiser`);

  let updated = withKeyAfter(pack, "professions", "recipes", recipes);
  updated = withKeyAfter(updated, "recipes", "instances", instances);
  updated = withKeyAfter(updated, "instances", "gathering", gathering);
  updated = withKeyAfter(updated, "build_sources", "credits", [CREDIT]);
  fs.writeFileSync(file, `${JSON.stringify(updated, null, 2)}\n`);
  console.log(`Nach ${file} geschrieben.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
