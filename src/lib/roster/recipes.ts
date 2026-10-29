import { and, asc, eq, inArray } from "drizzle-orm";
import type { DbExecutor } from "@/lib/db/client";
import { recipeEntries } from "@/lib/db/schema";
import { allTranslations, localize } from "@/i18n/localize";
import { splitNameNote } from "@/lib/name-note";
import { recipesOfProfession, type GameCatalog } from "./game-catalog";

export interface Recipe {
  name: string;
  notes: string | null;
}

export interface StoredRecipe extends Recipe {
  /** The pack's recipe when the line names one; null for free text. */
  recipeEntryId: number | null;
}

/** A pack recipe a line may name, in any of its languages. */
export interface KnownRecipe {
  entryId: number;
  /** The name stored and shown, in the UI language. */
  name: string;
  names: string[];
}

/**
 * The pack recipes of one profession a line may link to: active ones, plus outdated ones
 * the character already has, so saving does not silently unlink them (SPEC 6.5 B).
 */
export function knownRecipesOf(
  catalog: GameCatalog,
  professionKey: string,
  linkedIds: readonly number[] = [],
): KnownRecipe[] {
  return recipesOfProfession(catalog, professionKey, linkedIds).map(
    (entry) => ({
      entryId: entry.id,
      name: localize(entry.name),
      names: allTranslations(entry.name),
    }),
  );
}

const MAX_RECIPES = 100;
const MAX_NAME = 100;
const MAX_NOTES = 200;
const NOTE_SEPARATOR = /^\s+[-–]\s+/;

/**
 * Recipes are edited as text, one per line, optionally with a note after a spaced dash
 * ("Mächtiger Heiltrank – nur mit eigenen Kräutern"). A line that starts with a known
 * recipe's name is linked to it; that name may contain a dash itself
 * ("Armschiene - Schwache Abwehr").
 */
export function parseRecipeLines(
  text: string,
  known: readonly KnownRecipe[] = [],
): { ok: true; recipes: StoredRecipe[] } | { ok: false; error: string } {
  const recipes = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => matchKnownRecipe(line, known) ?? freeTextRecipe(line));
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

function freeTextRecipe(line: string): StoredRecipe {
  return { ...splitNameNote(line), recipeEntryId: null };
}

/** The longest known name the line starts with, so "Elixier der Weisen" beats "Elixier". */
function matchKnownRecipe(
  line: string,
  known: readonly KnownRecipe[],
): StoredRecipe | undefined {
  const lower = line.toLowerCase();
  let best: { recipe: KnownRecipe; length: number } | undefined;
  for (const recipe of known) {
    for (const name of recipe.names) {
      const candidate = name.toLowerCase();
      const rest = line.slice(candidate.length);
      const endsHere = rest === "" || NOTE_SEPARATOR.test(rest);
      if (
        lower.startsWith(candidate) &&
        endsHere &&
        candidate.length > (best?.length ?? 0)
      ) {
        best = { recipe, length: candidate.length };
      }
    }
  }
  if (!best) {
    return undefined;
  }
  const notes = line.slice(best.length).replace(NOTE_SEPARATOR, "").trim();
  return {
    name: best.recipe.name,
    notes: notes || null,
    recipeEntryId: best.recipe.entryId,
  };
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
): Array<StoredRecipe & { professionEntryId: number }> {
  return db
    .select({
      professionEntryId: recipeEntries.professionEntryId,
      recipeEntryId: recipeEntries.recipeEntryId,
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
  recipes: readonly StoredRecipe[],
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

/** Pack recipes the character has linked, so outdated ones stay linkable on edit. */
export function linkedRecipeIds(db: DbExecutor, characterId: number): number[] {
  return listRecipes(db, characterId)
    .map((recipe) => recipe.recipeEntryId)
    .filter((id): id is number => id !== null);
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
