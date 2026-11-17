// Pack recipe IDs carry the profession and the game's spell ID, "<profession>-<spell id>",
// because a few spells belong to two professions. The ForeverDB import writes them, the
// addon exchange reads them back.

export function recipeKey(professionKey: string, spellId: number): string {
  return `${professionKey}-${spellId}`;
}

/** The spell ID of a recipe key; undefined for recipes not named after a spell. */
export function spellIdOfRecipeKey(
  key: string,
  professionKey: string,
): number | undefined {
  const prefix = `${professionKey}-`;
  if (!key.startsWith(prefix)) {
    return undefined;
  }
  const spellId = Number(key.slice(prefix.length));
  return Number.isInteger(spellId) && spellId > 0 ? spellId : undefined;
}
