import { and, asc, eq, inArray } from "drizzle-orm";
import type { DbExecutor } from "@/lib/db/client";
import { recipeEntries } from "@/lib/db/schema";

export interface Recipe {
  name: string;
  notes: string | null;
}

const MAX_RECIPES = 100;
const MAX_NAME = 100;
const MAX_NOTES = 200;
/** "Name – Notiz": a spaced dash separates the optional note. */
const NOTE_SEPARATOR = /(?:^|\s)[-–]\s/;

/**
 * Recipes are edited as text, one per line, optionally with a note after a spaced dash
 * ("Mächtiger Heiltrank – nur mit eigenen Kräutern").
 */
export function parseRecipeLines(
  text: string,
): { ok: true; recipes: Recipe[] } | { ok: false; error: string } {
  const recipes = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = NOTE_SEPARATOR.exec(line);
      return match
        ? {
            name: line.slice(0, match.index).trim(),
            notes: line.slice(match.index + match[0].length).trim() || null,
          }
        : { name: line, notes: null };
    });
  if (recipes.length > MAX_RECIPES) {
    return { ok: false, error: `Höchstens ${MAX_RECIPES} Rezepte.` };
  }
  if (recipes.some((recipe) => !recipe.name || recipe.name.length > MAX_NAME)) {
    return { ok: false, error: `Rezeptnamen mit 1 bis ${MAX_NAME} Zeichen.` };
  }
  if (recipes.some((recipe) => (recipe.notes?.length ?? 0) > MAX_NOTES)) {
    return { ok: false, error: `Notizen höchstens ${MAX_NOTES} Zeichen.` };
  }
  return { ok: true, recipes };
}

export function formatRecipeLines(recipes: readonly Recipe[]): string {
  return recipes
    .map((recipe) =>
      recipe.notes ? `${recipe.name} – ${recipe.notes}` : recipe.name,
    )
    .join("\n");
}

export function listRecipes(
  db: DbExecutor,
  characterId: number,
): Array<Recipe & { professionEntryId: number }> {
  return db
    .select({
      professionEntryId: recipeEntries.professionEntryId,
      name: recipeEntries.name,
      notes: recipeEntries.notes,
    })
    .from(recipeEntries)
    .where(eq(recipeEntries.characterId, characterId))
    .orderBy(asc(recipeEntries.id))
    .all();
}

export function replaceRecipes(
  db: DbExecutor,
  characterId: number,
  professionEntryId: number,
  recipes: readonly Recipe[],
): void {
  deleteRecipes(db, characterId, [professionEntryId]);
  if (recipes.length > 0) {
    db.insert(recipeEntries)
      .values(
        recipes.map((recipe) => ({
          characterId,
          professionEntryId,
          ...recipe,
        })),
      )
      .run();
  }
}

/** A character that drops a profession drops its recipes with it. */
export function deleteRecipes(
  db: DbExecutor,
  characterId: number,
  professionEntryIds: readonly number[],
): void {
  if (professionEntryIds.length === 0) {
    return;
  }
  db.delete(recipeEntries)
    .where(
      and(
        eq(recipeEntries.characterId, characterId),
        inArray(recipeEntries.professionEntryId, [...professionEntryIds]),
      ),
    )
    .run();
}
