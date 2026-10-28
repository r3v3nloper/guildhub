// Shared by the character form (client) and resolveCharacter (server), so the classes
// the form offers are exactly the ones the server accepts (SPEC 4.5). Keep it free of
// server-only imports.

export interface RestrictedClass {
  key: string;
  /** Factions that may play the class; empty means all. */
  factions: string[];
}

export interface RestrictingRace {
  faction?: string;
  /** Classes the race may be; empty means all. */
  allowedClasses: string[];
}

export function classFitsFaction(
  characterClass: RestrictedClass,
  factionKey: string | undefined,
): boolean {
  return (
    !factionKey ||
    characterClass.factions.length === 0 ||
    characterClass.factions.includes(factionKey)
  );
}

export function classFitsRace(
  characterClass: RestrictedClass,
  race: RestrictingRace | undefined,
): boolean {
  return (
    !race ||
    race.allowedClasses.length === 0 ||
    race.allowedClasses.includes(characterClass.key)
  );
}

/** With races on, the faction follows from the race; otherwise it is chosen directly. */
export function allowedClasses<T extends RestrictedClass>(
  classes: readonly T[],
  race: RestrictingRace | undefined,
  factionKey: string | undefined,
): T[] {
  const faction = race ? race.faction : factionKey;
  return classes.filter(
    (characterClass) =>
      classFitsRace(characterClass, race) &&
      classFitsFaction(characterClass, faction),
  );
}
