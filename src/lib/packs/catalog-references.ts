import type { SQLiteColumn, SQLiteTable } from "drizzle-orm/sqlite-core";
import {
  builds,
  characterProfessions,
  characters,
  checklists,
  craftRequests,
  farmSpots,
  recipeEntries,
  statPriorities,
  taskDefinitions,
} from "@/lib/db/schema";
import type { CatalogKind } from "./catalog";

/** One column that points at a catalog entry, and how the sync treats it (SPEC 6.5 B). */
export interface CatalogReference {
  table: SQLiteTable;
  column: SQLiteColumn;
  /** Most references store the entry's surrogate ID; free-text-capable ones store its key. */
  storedAs: "entryId" | "key";
  /** Key references are only unique within a game. */
  gameColumn?: SQLiteColumn;
  /** Reported as an affected character when its entry disappears from the pack. */
  characterColumn?: SQLiteColumn;
  /**
   * The column that, together with `column`, forms a unique key. If an owner already holds
   * the replacement, its old row is merged away instead of rewritten into a duplicate.
   */
  uniqueWith?: SQLiteColumn;
}

/**
 * Every place that references a catalog entry. A new reference is added here, and
 * replaces/removal handle it.
 */
export const CATALOG_REFERENCES: Record<CatalogKind, CatalogReference[]> = {
  class: [
    {
      table: characters,
      column: characters.classEntryId,
      storedAs: "entryId",
      characterColumn: characters.id,
    },
    {
      table: builds,
      column: builds.targetClassEntryId,
      storedAs: "entryId",
    },
    {
      table: statPriorities,
      column: statPriorities.classEntryId,
      storedAs: "entryId",
    },
  ],
  spec: [
    {
      table: characters,
      column: characters.specEntryId,
      storedAs: "entryId",
      characterColumn: characters.id,
    },
    {
      table: characters,
      column: characters.offSpecEntryId,
      storedAs: "entryId",
      characterColumn: characters.id,
    },
  ],
  race: [
    {
      table: characters,
      column: characters.raceEntryId,
      storedAs: "entryId",
      characterColumn: characters.id,
    },
  ],
  faction: [
    {
      table: characters,
      column: characters.factionEntryId,
      storedAs: "entryId",
      characterColumn: characters.id,
    },
  ],
  profession: [
    {
      table: characterProfessions,
      column: characterProfessions.professionEntryId,
      storedAs: "entryId",
      characterColumn: characterProfessions.characterId,
      uniqueWith: characterProfessions.characterId,
    },
    {
      table: farmSpots,
      column: farmSpots.professionEntryId,
      storedAs: "entryId",
    },
    {
      table: recipeEntries,
      column: recipeEntries.professionEntryId,
      storedAs: "entryId",
    },
    {
      table: craftRequests,
      column: craftRequests.professionEntryId,
      storedAs: "entryId",
    },
  ],
  recipe: [
    {
      table: recipeEntries,
      column: recipeEntries.recipeEntryId,
      storedAs: "entryId",
    },
    {
      table: craftRequests,
      column: craftRequests.recipeEntryId,
      storedAs: "entryId",
    },
  ],
  instance: [
    {
      table: checklists,
      column: checklists.instanceEntryId,
      storedAs: "entryId",
    },
  ],
  // Nothing references a gathering guide; it is read as a whole.
  gathering: [],
  server: [
    {
      table: characters,
      column: characters.serverKey,
      storedAs: "key",
      gameColumn: characters.gameId,
    },
  ],
  // Lockout progress stores boss keys in a JSON list, which a column rewrite cannot reach.
  boss: [],
  reset_rule: [
    {
      table: taskDefinitions,
      column: taskDefinitions.resetRuleEntryId,
      storedAs: "entryId",
    },
  ],
};
