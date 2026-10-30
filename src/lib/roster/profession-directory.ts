import { and, asc, eq, inArray, sql } from "drizzle-orm";
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
import { allTranslations, localize } from "@/i18n/localize";
import { formatReagents } from "./recipe-reagents";
import type { Recipe } from "./recipes";

/** A recipe as the directory shows it; pack recipes add skill and reagents. */
export interface DirectoryRecipe extends Recipe {
  skill: number | null;
  reagents: string | null;
  /** Names in every language, so the search finds "Elixir" as well as "Elixier". */
  searchNames: string[];
}

interface PackRecipeData {
  skill?: number;
}

export interface Crafter {
  characterId: number;
  userId: string;
  classColor: string | null;
  characterName: string;
  memberName: string;
  skillLevel: number | null;
  specialization: string | null;
  notes: string | null;
  recipes: DirectoryRecipe[];
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
  const packRecipeIds = recipes
    .map((recipe) => recipe.recipeEntryId)
    .filter((id): id is number => id !== null);
  const packRecipes = new Map(
    packRecipeIds.length === 0
      ? []
      : db
          .select()
          .from(gameCatalogEntries)
          .where(inArray(gameCatalogEntries.id, packRecipeIds))
          .all()
          .map((entry) => [entry.id, entry]),
  );
  const toDirectoryRecipe = (
    recipe: (typeof recipes)[number],
  ): DirectoryRecipe => {
    const entry =
      recipe.recipeEntryId === null
        ? undefined
        : packRecipes.get(recipe.recipeEntryId);
    const data = (entry?.data ?? {}) as PackRecipeData;
    return {
      name: entry ? localize(entry.name) : recipe.name,
      notes: recipe.notes,
      skill: data.skill ?? null,
      reagents: formatReagents(entry?.data ?? {}),
      searchNames: entry ? allTranslations(entry.name) : [recipe.name],
    };
  };

  const classIds = [
    ...new Set(
      rows
        .map((row) => row.character.classEntryId)
        .filter((id): id is number => id !== null),
    ),
  ];
  const classColors = new Map(
    classIds.length === 0
      ? []
      : db
          .select()
          .from(gameCatalogEntries)
          .where(inArray(gameCatalogEntries.id, classIds))
          .all()
          .map((entry) => [entry.id, (entry.data.color as string) ?? null]),
  );

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
      .map(toDirectoryRecipe);
    const haystack = [
      ...allTranslations(profession.name),
      details.specialization,
      details.notes,
      ...crafterRecipes.flatMap((recipe) => [
        ...recipe.searchNames,
        recipe.notes,
      ]),
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
      userId: character.userId,
      classColor:
        character.classEntryId === null
          ? null
          : (classColors.get(character.classEntryId) ?? null),
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
function matchingFirst(
  recipes: DirectoryRecipe[],
  query: string,
): DirectoryRecipe[] {
  if (!query) {
    return recipes;
  }
  const matching = recipes.filter(
    (recipe) =>
      recipe.searchNames.some((name) => name.toLowerCase().includes(query)) ||
      recipe.notes?.toLowerCase().includes(query),
  );
  return matching.length > 0 ? matching : recipes;
}

/** A profession of a game, whether anyone has it or not. */
export interface ProfessionSummary {
  id: number;
  gameId: string;
  key: string;
  name: LocalizedString;
  /** "primary", "secondary" or "gathering". */
  kind: string;
  /** Recipes the pack knows for it. */
  recipeCount: number;
  /** The highest skill any of its recipes needs; null without recipes. */
  topRecipeSkill: number | null;
}

/** Every active profession of the games, in pack order, with its recipe count. */
export function listProfessions(
  db: AppDatabase,
  gameIds: readonly string[],
): ProfessionSummary[] {
  if (gameIds.length === 0) {
    return [];
  }
  const ofProfession = sql<string>`json_extract(${gameCatalogEntries.data}, '$.profession')`;
  const counts = new Map(
    db
      .select({
        gameId: gameCatalogEntries.gameId,
        profession: ofProfession,
        count: sql<number>`count(*)`,
        top: sql<
          number | null
        >`max(json_extract(${gameCatalogEntries.data}, '$.skill'))`,
      })
      .from(gameCatalogEntries)
      .where(
        and(
          inArray(gameCatalogEntries.gameId, [...gameIds]),
          eq(gameCatalogEntries.kind, "recipe"),
          eq(gameCatalogEntries.status, "active"),
        ),
      )
      .groupBy(gameCatalogEntries.gameId, ofProfession)
      .all()
      .map((row) => [`${row.gameId}:${row.profession}`, row]),
  );
  return db
    .select()
    .from(gameCatalogEntries)
    .where(
      and(
        inArray(gameCatalogEntries.gameId, [...gameIds]),
        eq(gameCatalogEntries.kind, "profession"),
        eq(gameCatalogEntries.status, "active"),
      ),
    )
    .orderBy(asc(gameCatalogEntries.id))
    .all()
    .map((entry) => ({
      id: entry.id,
      gameId: entry.gameId,
      key: entry.key,
      name: entry.name,
      kind: String(entry.data.kind ?? "primary"),
      recipeCount: counts.get(`${entry.gameId}:${entry.key}`)?.count ?? 0,
      topRecipeSkill: counts.get(`${entry.gameId}:${entry.key}`)?.top ?? null,
    }));
}
