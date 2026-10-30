import { and, eq, notInArray } from "drizzle-orm";
import type { AppDatabase } from "@/lib/db/client";
import {
  gameCatalogEntries,
  games,
  guildGames,
  type GameMeta,
} from "@/lib/db/schema";
import type { CatalogKind } from "@/lib/packs/catalog";
import type { LocalizedString } from "@/lib/packs/schema";

export type CatalogEntry = typeof gameCatalogEntries.$inferSelect;

export interface GameInfo {
  id: string;
  name: LocalizedString;
  meta: GameMeta;
  packVersion: string;
}

export interface GameCatalog {
  game: GameInfo;
  entries: CatalogEntry[];
  /** False when loaded without recipes; absent means every kind is there. */
  withRecipes?: boolean;
}

/**
 * Gathering guides and class abilities are large and read on their own
 * (gathering-guide.ts, class-abilities.ts), never here.
 */
const NEVER_LOADED: CatalogKind[] = ["gathering", "abilities"];

export function catalogOfKind(
  catalog: GameCatalog,
  kind: CatalogKind,
): CatalogEntry[] {
  // An empty recipe list would silently turn recipe lookups into free text.
  if (kind === "recipe" && catalog.withRecipes === false) {
    throw new Error("Katalog wurde ohne Rezepte geladen.");
  }
  if (NEVER_LOADED.includes(kind) && catalog.withRecipes !== undefined) {
    throw new Error(`Katalogart ${kind} wird nicht mitgeladen.`);
  }
  return catalog.entries.filter((entry) => entry.kind === kind);
}

/** Choices for a new selection: removed and deprecated entries are not offered (SPEC 6.5). */
export function selectableOfKind(
  catalog: GameCatalog,
  kind: CatalogKind,
): CatalogEntry[] {
  return catalogOfKind(catalog, kind).filter(
    (entry) => entry.status === "active",
  );
}

/**
 * Recipes are by far the largest catalog (thousands in WoW), so they are only loaded
 * when a caller asks for them.
 */
export function loadGameCatalog(
  db: AppDatabase,
  gameId: string,
  options: { withRecipes?: boolean } = {},
): GameCatalog | undefined {
  const game = db.select().from(games).where(eq(games.id, gameId)).get();
  if (!game) {
    return undefined;
  }
  const withRecipes = options.withRecipes ?? false;
  return {
    game,
    withRecipes,
    entries: db
      .select()
      .from(gameCatalogEntries)
      .where(
        and(
          eq(gameCatalogEntries.gameId, gameId),
          notInArray(
            gameCatalogEntries.kind,
            withRecipes ? NEVER_LOADED : [...NEVER_LOADED, "recipe"],
          ),
        ),
      )
      .orderBy(gameCatalogEntries.id)
      .all(),
  };
}

export interface GuildGameInfo extends GameInfo {
  enabled: boolean;
  regionId: string | null;
  lastSyncError: string | null;
}

export function listGuildGames(
  db: AppDatabase,
  guildId: number,
): GuildGameInfo[] {
  return db
    .select({
      id: games.id,
      name: games.name,
      meta: games.meta,
      packVersion: games.packVersion,
      lastSyncError: games.lastSyncError,
      enabled: guildGames.enabled,
      regionId: guildGames.regionId,
    })
    .from(guildGames)
    .innerJoin(games, eq(games.id, guildGames.gameId))
    .where(eq(guildGames.guildId, guildId))
    .orderBy(games.id)
    .all();
}

export function listEnabledGames(
  db: AppDatabase,
  guildId: number,
): GuildGameInfo[] {
  return listGuildGames(db, guildId).filter((game) => game.enabled);
}

export function isGameEnabled(
  db: AppDatabase,
  guildId: number,
  gameId: string,
): boolean {
  return (
    db
      .select({ enabled: guildGames.enabled })
      .from(guildGames)
      .where(
        and(eq(guildGames.guildId, guildId), eq(guildGames.gameId, gameId)),
      )
      .get()?.enabled === true
  );
}

/**
 * A profession's recipes: the active ones, plus outdated ones listed in `keepIds` because
 * something still references them (SPEC 6.5 B).
 */
export function recipesOfProfession(
  catalog: GameCatalog,
  professionKey: string,
  keepIds: readonly number[] = [],
): CatalogEntry[] {
  return catalogOfKind(catalog, "recipe").filter(
    (entry) =>
      entry.data.profession === professionKey &&
      (entry.status === "active" || keepIds.includes(entry.id)),
  );
}
