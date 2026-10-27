import { and, eq } from "drizzle-orm";
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
}

export function catalogOfKind(
  catalog: GameCatalog,
  kind: CatalogKind,
): CatalogEntry[] {
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

export function loadGameCatalog(
  db: AppDatabase,
  gameId: string,
): GameCatalog | undefined {
  const game = db.select().from(games).where(eq(games.id, gameId)).get();
  if (!game) {
    return undefined;
  }
  return {
    game,
    entries: db
      .select()
      .from(gameCatalogEntries)
      .where(eq(gameCatalogEntries.gameId, gameId))
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
