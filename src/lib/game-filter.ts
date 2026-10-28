import { cookies } from "next/headers";
import type { AppDatabase } from "@/lib/db/client";
import {
  listEnabledGames,
  type GuildGameInfo,
} from "@/lib/roster/game-catalog";

/** The global game switcher (SPEC 7.2) is remembered per browser in a cookie. */
export const GAME_FILTER_COOKIE = "guildhub-game";

/** Selected game ID, or undefined for "Alle Spiele". */
export async function readGameFilter(
  enabledGameIds: readonly string[],
): Promise<string | undefined> {
  const value = (await cookies()).get(GAME_FILTER_COOKIE)?.value;
  return value && enabledGameIds.includes(value) ? value : undefined;
}

export interface GameSelection {
  /** Every game the guild has enabled. */
  enabled: GuildGameInfo[];
  /** The game picked in the switcher, if any. */
  selectedId: string | undefined;
  /** What a page shows: the picked game, or all enabled games. */
  games: GuildGameInfo[];
}

export async function selectedGames(
  db: AppDatabase,
  guildId: number,
): Promise<GameSelection> {
  const enabled = listEnabledGames(db, guildId);
  const selectedId = await readGameFilter(enabled.map((game) => game.id));
  return {
    enabled,
    selectedId,
    games: enabled.filter((game) => !selectedId || game.id === selectedId),
  };
}
