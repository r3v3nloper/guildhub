import {
  recipesOfProfession,
  type CatalogEntry,
  type GameCatalog,
} from "./game-catalog";

/**
 * The recipes a crafting request for this profession must choose from, or null when the
 * request is free text. Free text is for materials: gathering professions by default, or
 * any profession whose pack entry says `requests: "free"`, and professions without recipes.
 */
export function requestRecipesOf(
  catalog: GameCatalog,
  profession: CatalogEntry,
): CatalogEntry[] | null {
  const mode =
    profession.data.requests ??
    (profession.data.kind === "gathering" ? "free" : "recipes");
  if (mode === "free") {
    return null;
  }
  const recipes = recipesOfProfession(catalog, profession.key);
  return recipes.length > 0 ? recipes : null;
}
