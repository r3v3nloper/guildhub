import { and, asc, eq, inArray } from "drizzle-orm";
import type { AppDatabase } from "@/lib/db/client";
import {
  characterProfessions,
  characters,
  gameCatalogEntries,
  guildMembers,
  recipeEntries,
  users,
} from "@/lib/db/schema";
import type { LocalizedString } from "@/lib/packs/schema";
import { allTranslations } from "@/i18n/localize";
import type { Recipe } from "./recipes";

export interface Crafter {
  characterId: number;
  characterName: string;
  memberName: string;
  skillLevel: number | null;
  specialization: string | null;
  notes: string | null;
  recipes: Recipe[];
}

export interface DirectoryProfession {
  gameId: string;
  key: string;
  name: LocalizedString;
  kind: string;
  crafters: Crafter[];
}

/**
 * "Wer kann X?" (SPEC 7, item 6): professions of the given games with every active
 * member's character that has them. The search matches profession names in all
 * languages, recipes, specialisations and notes, case-insensitively.
 */
export function loadProfessionDirectory(
  db: AppDatabase,
  guildId: number,
  gameIds: readonly string[],
  search: { professionKey?: string; query?: string } = {},
): DirectoryProfession[] {
  if (gameIds.length === 0) {
    return [];
  }
  const rows = db
    .select({
      profession: gameCatalogEntries,
      details: characterProfessions,
      character: characters,
      memberName: users.name,
    })
    .from(characterProfessions)
    .innerJoin(
      gameCatalogEntries,
      eq(gameCatalogEntries.id, characterProfessions.professionEntryId),
    )
    .innerJoin(characters, eq(characters.id, characterProfessions.characterId))
    .innerJoin(users, eq(users.id, characters.userId))
    .innerJoin(
      guildMembers,
      and(
        eq(guildMembers.userId, characters.userId),
        eq(guildMembers.guildId, guildId),
      ),
    )
    .where(
      and(
        inArray(characters.gameId, [...gameIds]),
        eq(guildMembers.status, "active"),
      ),
    )
    .orderBy(asc(gameCatalogEntries.id), asc(characters.name))
    .all();
  const recipes =
    rows.length === 0
      ? []
      : db
          .select()
          .from(recipeEntries)
          .where(
            inArray(
              recipeEntries.characterId,
              rows.map((row) => row.character.id),
            ),
          )
          .orderBy(asc(recipeEntries.name))
          .all();

  const query = search.query?.trim().toLowerCase() ?? "";
  const professions = new Map<number, DirectoryProfession>();
  for (const { profession, details, character, memberName } of rows) {
    if (search.professionKey && profession.key !== search.professionKey) {
      continue;
    }
    const crafterRecipes = recipes
      .filter(
        (recipe) =>
          recipe.characterId === character.id &&
          recipe.professionEntryId === profession.id,
      )
      .map(({ name, notes }) => ({ name, notes }));
    const haystack = [
      ...allTranslations(profession.name),
      details.specialization,
      details.notes,
      ...crafterRecipes.flatMap((recipe) => [recipe.name, recipe.notes]),
    ];
    if (
      query &&
      !haystack.some((text) => text?.toLowerCase().includes(query))
    ) {
      continue;
    }
    const entry = professions.get(profession.id) ?? {
      gameId: profession.gameId,
      key: profession.key,
      name: profession.name,
      kind: String(profession.data.kind ?? "primary"),
      crafters: [],
    };
    entry.crafters.push({
      characterId: character.id,
      characterName: character.name,
      memberName: memberName ?? "?",
      skillLevel: details.skillLevel,
      specialization: details.specialization,
      notes: details.notes,
      recipes: matchingFirst(crafterRecipes, query),
    });
    professions.set(profession.id, entry);
  }
  return [...professions.values()];
}

/** When the search hit recipes, show just those; otherwise the full list. */
function matchingFirst(recipes: Recipe[], query: string): Recipe[] {
  if (!query) {
    return recipes;
  }
  const matching = recipes.filter(
    (recipe) =>
      recipe.name.toLowerCase().includes(query) ||
      recipe.notes?.toLowerCase().includes(query),
  );
  return matching.length > 0 ? matching : recipes;
}
