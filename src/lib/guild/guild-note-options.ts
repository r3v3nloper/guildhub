import type { AppDatabase } from "@/lib/db/client";
import { listEnabledGames } from "@/lib/roster/game-catalog";
import { localize } from "@/i18n/localize";

/** Games a note can belong to: those the guild has enabled. */
export function guildNoteGameOptions(
  db: AppDatabase,
  guildId: number,
): Array<{ value: string; label: string }> {
  return listEnabledGames(db, guildId).map((game) => ({
    value: game.id,
    label: localize(game.name),
  }));
}
