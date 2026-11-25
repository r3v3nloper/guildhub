// Character names from the game against those in GuildHub. WoW Forever gives characters a
// first name and a surname; the addon sends both, separated by a space ("Relitia Relikt").
// Members type them by hand with varying case and spacing, and addon versions before 0.4
// sent the first name alone, so GuildHub may know a character by its first name only.

export type NameMatch = "exact" | "firstName" | "none";

function normalized(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * "exact" for the same name up to case and spacing. "firstName" when GuildHub knows only
 * the first name of a game name with surname; that may be a different character of the
 * same first name, so callers try exact matches first.
 */
export function matchCharacterName(
  gameName: string,
  storedName: string,
): NameMatch {
  const game = normalized(gameName);
  const stored = normalized(storedName);
  if (game === stored) {
    return "exact";
  }
  const [firstName, ...surname] = game.split(" ");
  return surname.length > 0 && !stored.includes(" ") && stored === firstName
    ? "firstName"
    : "none";
}

/** A name in the form that identifies a character, for keys and comparisons. */
export function characterNameKey(name: string): string {
  return normalized(name);
}
