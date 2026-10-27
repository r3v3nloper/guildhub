import { cookies } from "next/headers";

/** The global game switcher (SPEC 7.2) is remembered per browser in a cookie. */
export const GAME_FILTER_COOKIE = "guildhub-game";

/** Selected game ID, or undefined for "Alle Spiele". */
export async function readGameFilter(
  enabledGameIds: readonly string[],
): Promise<string | undefined> {
  const value = (await cookies()).get(GAME_FILTER_COOKIE)?.value;
  return value && enabledGameIds.includes(value) ? value : undefined;
}
