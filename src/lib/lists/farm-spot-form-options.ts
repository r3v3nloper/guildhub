import type { AppDatabase } from "@/lib/db/client";
import {
  listGuildGames,
  loadGameCatalog,
  selectableOfKind,
} from "@/lib/roster/game-catalog";
import { localize } from "@/i18n/localize";

export interface FarmSpotGameOption {
  value: string;
  label: string;
  professions: Array<{ value: string; label: string }>;
}

/** Games with their selectable professions; `onlyEnabled` for new spots. */
export function farmSpotGames(
  db: AppDatabase,
  guildId: number,
  onlyEnabled: boolean,
): FarmSpotGameOption[] {
  return listGuildGames(db, guildId)
    .filter((game) => game.enabled || !onlyEnabled)
    .map((game) => {
      const catalog = loadGameCatalog(db, game.id);
      return {
        value: game.id,
        label: localize(game.name),
        professions: catalog
          ? selectableOfKind(catalog, "profession").map((entry) => ({
              value: entry.key,
              label: localize(entry.name),
            }))
          : [],
      };
    });
}
