import fs from "node:fs";
import path from "node:path";
import { packsDirectory, PACK_FILE_NAME } from "../src/lib/packs/loader";
import { abilitiesOf, knownAbilityNames } from "./foreverdb/abilities";
import { apiKey } from "./foreverdb/api";
import { gatheringOf } from "./foreverdb/gathering";
import { instancesOf } from "./foreverdb/instances";
import { compact, withKeyAfter } from "./foreverdb/pack-json";
import { recipesOf } from "./foreverdb/recipes";

// Pulls the recipes and gathering guides of the pack's professions, the abilities of its
// classes and the dungeons and raids from the ForeverDB API into pack.json, so the app
// itself never needs the API key or a connection to ForeverDB at runtime. The transforms
// live in ./foreverdb, one module per kind of data.
// Usage: npm run packs:foreverdb [-- <pack-id>]   (needs FOREVERDB_API_KEY, e.g. in .env.local)

const CREDIT = {
  label: "Data from ForeverDB.net",
  url: "https://foreverdb.net",
};

async function main() {
  const packId = process.argv[2] ?? "wow-forever";
  const file = path.join(packsDirectory(), packId, PACK_FILE_NAME);
  const pack = JSON.parse(fs.readFileSync(file, "utf8")) as Record<
    string,
    unknown
  > & {
    professions: Array<{ id: string; name: unknown }>;
    instances?: Array<{ id: string; name: unknown }>;
    classes: Array<{ id: string; name: unknown }>;
    abilities?: Array<{ abilities?: Array<{ name: unknown }> }>;
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
  const abilities = (
    await abilitiesOf(key, pack.classes, knownAbilityNames(pack.abilities))
  ).map((entry) => compact({ ...entry }));
  console.log(`Fähigkeiten für ${abilities.length} Klassen`);
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
  updated = withKeyAfter(updated, "gathering", "abilities", abilities);
  updated = withKeyAfter(updated, "build_sources", "credits", [CREDIT]);
  fs.writeFileSync(file, `${JSON.stringify(updated, null, 2)}\n`);
  console.log(`Nach ${file} geschrieben.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
