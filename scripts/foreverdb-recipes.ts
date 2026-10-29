import fs from "node:fs";
import path from "node:path";
import { packsDirectory, PACK_FILE_NAME } from "../src/lib/packs/loader";
import type { PackRecipe } from "../src/lib/packs/schema";

// Pulls every recipe of the pack's professions from the ForeverDB API into pack.json, so
// the app itself never needs the API key or a connection to ForeverDB at runtime.
// Usage: npm run packs:foreverdb [-- <pack-id>]   (needs FOREVERDB_API_KEY, e.g. in .env.local)

const API = "https://foreverdb.net/api/v1";
const CREDIT = {
  label: "Data from ForeverDB.net",
  url: "https://foreverdb.net",
};
const PAGE_SIZE = 100;
// The API allows 60 requests a minute per key.
const REQUEST_GAP_MS = 1100;

interface ApiName {
  /** Null for items the client keeps hidden until the game sends them. */
  name: string | null;
  nameEn?: string | null;
}

interface ApiRecipe extends ApiName {
  spellId: number;
  skill: { orange: number | null } | null;
  reagents: Array<ApiName & { count: number }>;
  url: string;
  /** Set on a leftover copy of another recipe with the same name. */
  leftoverOf: number | null;
}

interface ApiPage {
  data: { recipes: ApiRecipe[] };
  meta: { total: number; next: string | null; build: string };
}

function apiKey(): string {
  if (!process.env.FOREVERDB_API_KEY && fs.existsSync(".env.local")) {
    process.loadEnvFile(".env.local");
  }
  const key = process.env.FOREVERDB_API_KEY;
  if (!key) {
    throw new Error("FOREVERDB_API_KEY fehlt (Umgebung oder .env.local).");
  }
  return key;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchPage(key: string, url: string): Promise<ApiPage> {
  const response = await fetch(url, { headers: { "X-API-Key": key } });
  if (!response.ok) {
    throw new Error(`${response.status} bei ${url}: ${await response.text()}`);
  }
  return (await response.json()) as ApiPage;
}

const UNKNOWN_ITEM = { de: "Unbekannter Gegenstand", en: "Unknown item" };

function localized({ name, nameEn }: ApiName) {
  if (!name) {
    return UNKNOWN_ITEM;
  }
  return { de: name, en: nameEn ?? name };
}

function toPackRecipe(professionId: string, recipe: ApiRecipe): PackRecipe {
  return {
    // A few recipes belong to two professions, so the spell ID alone is not unique.
    id: `${professionId}-${recipe.spellId}`,
    name: localized(recipe),
    profession: professionId,
    skill: recipe.skill?.orange ?? undefined,
    reagents: recipe.reagents.map((reagent) => ({
      name: localized(reagent),
      count: reagent.count,
    })),
    link: recipe.url,
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
    const page = await fetchPage(key, url);
    // Leftover copies (Season of Discovery items) cannot be learned in Forever.
    recipes.push(
      ...page.data.recipes
        .filter((recipe) => recipe.leftoverOf === null)
        .map((recipe) => toPackRecipe(professionId, recipe)),
    );
    build = page.meta.build;
    url = page.meta.next ? new URL(page.meta.next, API).toString() : null;
    await wait(REQUEST_GAP_MS);
  }
  return { recipes, build };
}

/** Keeps pack.json readable: no default-valued lifecycle fields, no empty reagent lists. */
function compact(recipe: PackRecipe) {
  const { deprecated, replaces, todo, reagents, ...rest } = recipe;
  return {
    ...rest,
    ...(reagents.length > 0 ? { reagents } : {}),
    ...(deprecated ? { deprecated } : {}),
    ...(replaces.length > 0 ? { replaces } : {}),
    ...(todo ? { todo } : {}),
  };
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
  > & { professions: Array<{ id: string }> };
  const key = apiKey();

  const all: ReturnType<typeof compact>[] = [];
  for (const profession of pack.professions) {
    const { recipes, build } = await recipesOf(key, profession.id);
    console.log(`${profession.id}: ${recipes.length} Rezepte (Build ${build})`);
    all.push(...recipes.map(compact));
  }

  let updated = withKeyAfter(pack, "professions", "recipes", all);
  updated = withKeyAfter(updated, "build_sources", "credits", [CREDIT]);
  fs.writeFileSync(file, `${JSON.stringify(updated, null, 2)}\n`);
  console.log(`${all.length} Rezepte nach ${file} geschrieben.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
