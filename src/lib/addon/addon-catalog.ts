import type { AppDatabase } from "@/lib/db/client";
import { DomainError } from "@/lib/errors";
import { requireCatalog } from "@/lib/roster/characters";
import type { GameCatalog } from "@/lib/roster/game-catalog";

/** The game's catalog with recipes, for games that exchange data with the addon. */
export function requireAddonCatalog(
  db: AppDatabase,
  gameId: string,
): GameCatalog {
  const catalog = requireCatalog(db, gameId, { withRecipes: true });
  if (!catalog.game.meta.capabilities.addon_import) {
    throw new DomainError("Dieses Spiel hat keinen Abgleich mit dem Addon.");
  }
  return catalog;
}
