import type { PackRecipe } from "../../src/lib/packs/schema";
import { API, fetchJson, localized, PAGE_SIZE, type ApiName } from "./api";

// Recipes per profession from ForeverDB's /professions/{slug}, in German.

export interface ApiRecipe extends ApiName {
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

/** The recipes of one page; leftover copies (Season of Discovery items) are not learnable. */
export function recipesForPack(
  professionId: string,
  recipes: readonly ApiRecipe[],
): PackRecipe[] {
  return recipes
    .filter((recipe) => recipe.leftoverOf === null)
    .map((recipe) => toPackRecipe(professionId, recipe));
}

export async function recipesOf(key: string, professionId: string) {
  const recipes: PackRecipe[] = [];
  let url: string | null =
    `${API}/professions/${professionId}?lang=de&limit=${PAGE_SIZE}`;
  let build = "";
  while (url) {
    const page: ApiRecipePage = await fetchJson<ApiRecipePage>(key, url);
    recipes.push(...recipesForPack(professionId, page.data.recipes));
    build = page.meta.build;
    url = page.meta.next ? new URL(page.meta.next, API).toString() : null;
  }
  return { recipes, build };
}
