import type { AppDatabase } from "@/lib/db/client";
import {
  listGuildGames,
  loadGameCatalog,
  selectableOfKind,
} from "@/lib/roster/game-catalog";
import { localize } from "@/i18n/localize";

export interface ProfessionGameOption {
  value: string;
  label: string;
  professions: Array<{ value: string; label: string }>;
}

/** Games with their selectable professions, for farm spots and crafting requests. */
export function professionGameOptions(
  db: AppDatabase,
  guildId: number,
  onlyEnabled: boolean,
): ProfessionGameOption[] {
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
