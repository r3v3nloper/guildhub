import type { PackClassAbilities } from "../../src/lib/packs/schema";
import { API, fetchJson } from "./api";

// What each class learns at which level, from ForeverDB's /classes/{name}. Its ability
// names are English; the German ones come from /spells/{id}, one request per spell, so
// names already in the pack are kept and only new spells are asked for.

/** Season of Discovery runes and the like never reach a Forever trainer. */
const LEARNED = new Set(["trainer", "quest"]);

export interface ApiAbility {
  name: string;
  learned: string;
  ranks: Array<{ spellId: number; rank: string; level: number }>;
}

interface ApiSpell {
  name: string;
  nameEn?: string;
}

type Ability = PackClassAbilities["abilities"][number];

/** English name → the localized name the pack already has. */
export function knownAbilityNames(
  entries: ReadonlyArray<{ abilities?: Array<{ name: unknown }> }> = [],
): Map<string, Ability["name"]> {
  const known = new Map<string, Ability["name"]>();
  for (const entry of entries) {
    for (const ability of entry.abilities ?? []) {
      const name = ability.name;
      if (name && typeof name === "object" && "en" in name) {
        known.set(String(name.en), name as Ability["name"]);
      }
    }
  }
  return known;
}

async function germanName(
  key: string,
  ability: ApiAbility,
  known: Map<string, Ability["name"]>,
): Promise<Ability["name"]> {
  const kept = known.get(ability.name);
  if (kept) {
    return kept;
  }
  const { data } = await fetchJson<{ data: ApiSpell }>(
    key,
    `${API}/spells/${ability.ranks[0].spellId}?lang=de`,
  );
  const name =
    data.name && data.name !== ability.name
      ? { de: data.name, en: ability.name }
      : ability.name;
  if (typeof name === "object") {
    known.set(ability.name, name);
  }
  return name;
}

/**
 * ForeverDB lists some talents and Hunter pet skills as trainer abilities. They give
 * themselves away by several numbered ranks all at the same level, which a trainer never
 * sells. Unnumbered duplicates (Reincarnation twice at 30) are real and merged instead.
 */
function isTalentOrPetSkill(ability: ApiAbility): boolean {
  return (
    ability.ranks.length > 1 &&
    ability.ranks.every(
      (rank) =>
        rank.level === ability.ranks[0].level && rankNumber(rank.rank) !== null,
    )
  );
}

export function uniqueRanks(ranks: Ability["ranks"]): Ability["ranks"] {
  const seen = new Set<string>();
  return ranks.filter((rank) => {
    const key = `${rank.rank}@${rank.level}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function rankNumber(rank: string): number | null {
  const match = /(\d+)/.exec(rank);
  return match ? Number(match[1]) : null;
}

/** Whether a listed ability belongs in the pack: trainer or quest, and no talent. */
export function isTrainerAbility(ability: ApiAbility): boolean {
  return (
    LEARNED.has(ability.learned) &&
    ability.ranks.length > 0 &&
    !isTalentOrPetSkill(ability)
  );
}

/** One entry per class the pack lists, in the pack's order. */
export async function abilitiesOf(
  key: string,
  classes: ReadonlyArray<{ id: string; name: unknown }>,
  known: Map<string, Ability["name"]>,
): Promise<PackClassAbilities[]> {
  const result: PackClassAbilities[] = [];
  for (const characterClass of classes) {
    const { data } = await fetchJson<{ data: { abilities: ApiAbility[] } }>(
      key,
      `${API}/classes/${characterClass.id}`,
    );
    const abilities: Ability[] = [];
    for (const ability of data.abilities) {
      if (!isTrainerAbility(ability)) {
        continue;
      }
      abilities.push({
        name: await germanName(key, ability, known),
        learned: ability.learned as Ability["learned"],
        ranks: uniqueRanks(
          ability.ranks.map((rank) => ({
            rank: rankNumber(rank.rank),
            level: rank.level,
          })),
        ),
      });
    }
    result.push({
      id: characterClass.id,
      name: characterClass.name as PackClassAbilities["name"],
      class: characterClass.id,
      abilities: abilities.sort((a, b) => a.ranks[0].level - b.ranks[0].level),
      deprecated: false,
      replaces: [],
      todo: false,
    });
  }
  return result;
}
