import { allTranslations } from "@/i18n/localize";
import { recipeKey } from "@/lib/packs/recipe-key";
import type { LocalizedString } from "@/lib/packs/schema";
import {
  catalogOfKind,
  type CatalogEntry,
  type GameCatalog,
} from "@/lib/roster/game-catalog";
import { normalizeServerKey } from "@/lib/roster/server-name";
import { matchCharacterName } from "./character-name";
import type { ExportedCharacter } from "./export-payload";

// What a character export would change (SPEC 7.3), worked out before anything is written,
// so the member sees it first and applying uses exactly what was shown.

/** A character of the importing member, as far as the import touches it. */
export interface OwnCharacterState {
  id: number;
  name: string;
  serverKey: string | null;
  factionEntryId: number | null;
  raceEntryId: number | null;
  classEntryId: number | null;
  level: number | null;
  deathCount: number;
  /** The addon's death count taken over last time; null before the first import. */
  addonDeathCount: number | null;
  professions: Array<{ entryId: number; skillLevel: number | null }>;
  linkedRecipeIds: number[];
}

/** A character of another member, which an import must never take over. */
export interface ForeignCharacter {
  name: string;
  serverKey: string | null;
}

export type PreviewStatus = "new" | "changed" | "unchanged" | "foreign";
export type CharacterField = "faction" | "race" | "class" | "level";

export interface ProfessionChange {
  entryId: number;
  skillLevel: number | null;
  /** Undefined when the character does not have the profession yet. */
  previousSkillLevel?: number | null;
}

export interface NewRecipe {
  professionEntryId: number;
  recipeEntryId: number;
  name: LocalizedString;
}

/** Catalogs whose entries the game names itself (game_ref). */
const REF_KINDS = ["faction", "race", "class", "profession"] as const;
type RefKind = (typeof REF_KINDS)[number];

export type UnknownValue =
  { kind: RefKind | "realm"; ref: string } | { kind: "recipes"; count: number };

export interface CharacterValues {
  factionEntryId: number | null;
  raceEntryId: number | null;
  classEntryId: number | null;
  level: number | null;
}

export interface CharacterPreview {
  realm: string;
  name: string;
  status: PreviewStatus;
  characterId: number | null;
  serverKey: string | null;
  /** The game's values; null where the game sent nothing usable, so the old one stays. */
  values: CharacterValues;
  /** The values in GuildHub before the import; null for a new or foreign character. */
  previous: CharacterValues | null;
  /** The character was entered without a server; the import adds the realm. */
  fillsInServer: boolean;
  /**
   * GuildHub knew the character by its first name only; the import renames it to the
   * game's full name. The name GuildHub had, or null.
   */
  renamesFrom: string | null;
  changedFields: CharacterField[];
  professions: ProfessionChange[];
  /** Professions the character has in GuildHub, but no longer in the game. */
  missingProfessionEntryIds: number[];
  newRecipes: NewRecipe[];
  deathsToAdd: number;
  addonDeathCount: number | null;
  /** What the pack does not know and the import therefore skips. */
  unknown: UnknownValue[];
}

export interface PreviewInput {
  catalog: GameCatalog;
  data: { characters: readonly ExportedCharacter[] };
  own: readonly OwnCharacterState[];
  foreign: readonly ForeignCharacter[];
  /**
   * Whether professions the game no longer has are offered for removal. Not for data
   * an officer brings in for another member (SPEC 7.3.3).
   */
  offerProfessionDrop?: boolean;
}

export function previewCharacterImport({
  catalog,
  data,
  own,
  foreign,
  offerProfessionDrop = true,
}: PreviewInput): CharacterPreview[] {
  const refs = new GameRefs(catalog);
  return data.characters.map((character) =>
    previewCharacter(
      character,
      refs,
      catalog,
      own,
      foreign,
      offerProfessionDrop,
    ),
  );
}

function previewCharacter(
  exported: ExportedCharacter,
  refs: GameRefs,
  catalog: GameCatalog,
  own: readonly OwnCharacterState[],
  foreign: readonly ForeignCharacter[],
  offerProfessionDrop: boolean,
): CharacterPreview {
  const unknown: UnknownValue[] = [];
  const serverKey = refs.serverKey(exported.realm, unknown);
  const values = {
    factionEntryId: refs.entryId("faction", exported.factionRef, unknown),
    raceEntryId: refs.entryId("race", exported.raceRef, unknown),
    classEntryId: refs.entryId("class", exported.classRef, unknown),
    level: exported.level,
  };
  const base = {
    realm: exported.realm,
    name: exported.name,
    serverKey,
    values,
    unknown,
    fillsInServer: false,
    renamesFrom: null,
  };

  // Only the full name counts here: another member's "Relitia" may be a different
  // character than this "Relitia Relikt".
  if (
    foreign.some(
      (c) =>
        matchCharacterName(exported.name, c.name) === "exact" &&
        mayBeSameServer(serverKey, c.serverKey),
    )
  ) {
    return { ...base, ...nothingChanges(), status: "foreign", previous: null };
  }

  const { existing, renamesFrom } = findOwn(exported.name, serverKey, own);

  const professions = refs.professions(exported, unknown);
  const professionChanges = professions
    .map(({ entry, skillLevel }) => ({
      entryId: entry.id,
      skillLevel,
      previous: existing?.professions.find((p) => p.entryId === entry.id),
    }))
    .filter(
      ({ skillLevel, previous }) =>
        !previous ||
        (skillLevel !== null && skillLevel !== previous.skillLevel),
    )
    .map(({ entryId, skillLevel, previous }) =>
      previous
        ? { entryId, skillLevel, previousSkillLevel: previous.skillLevel }
        : { entryId, skillLevel },
    );
  const keptIds = new Set(professions.map(({ entry }) => entry.id));
  const missingProfessionEntryIds = offerProfessionDrop
    ? (existing?.professions ?? [])
        .map((p) => p.entryId)
        .filter((entryId) => !keptIds.has(entryId) && refs.hasGameRef(entryId))
    : [];

  const linked = new Set(existing?.linkedRecipeIds ?? []);
  const newRecipes = refs
    .recipes(professions, unknown)
    .filter((recipe) => !linked.has(recipe.recipeEntryId));

  const deaths = deathsToAdd(catalog, exported, existing);
  const changedFields = existing ? changedFieldsOf(existing, values) : [];
  const changes = {
    changedFields,
    professions: professionChanges,
    missingProfessionEntryIds,
    newRecipes,
    deathsToAdd: deaths.add,
    addonDeathCount: deaths.addonDeathCount,
  };

  if (!existing) {
    return {
      ...base,
      ...changes,
      status: "new",
      characterId: null,
      previous: null,
    };
  }
  const fillsInServer = serverKey !== null && existing.serverKey !== serverKey;
  const changed =
    renamesFrom !== null ||
    changedFields.length > 0 ||
    professionChanges.length > 0 ||
    missingProfessionEntryIds.length > 0 ||
    newRecipes.length > 0 ||
    deaths.add > 0 ||
    fillsInServer;
  return {
    ...base,
    ...changes,
    fillsInServer,
    renamesFrom,
    status: changed ? "changed" : "unchanged",
    characterId: existing.id,
    previous: {
      factionEntryId: existing.factionEntryId,
      raceEntryId: existing.raceEntryId,
      classEntryId: existing.classEntryId,
      level: existing.level,
    },
  };
}

/**
 * Whether a character of the export may be one GuildHub knows, by server. A character
 * entered without a server may be on any; so may one the game named no realm for (WoW
 * Forever 1.60.1 names none to addons).
 */
export function mayBeSameServer(
  exportedKey: string | null,
  storedKey: string | null,
): boolean {
  return (
    exportedKey === null || storedKey === null || exportedKey === storedKey
  );
}

/**
 * The member's character the game's one is. The full name wins over a first-name match,
 * the same server over one entered without; without a realm from the game, a name that is
 * unique among the member's characters suffices.
 */
function findOwn(
  gameName: string,
  serverKey: string | null,
  own: readonly OwnCharacterState[],
): { existing: OwnCharacterState | undefined; renamesFrom: string | null } {
  const candidates = (match: "exact" | "firstName") =>
    own.filter((c) => matchCharacterName(gameName, c.name) === match);
  for (const match of ["exact", "firstName"] as const) {
    const named = candidates(match);
    const anyServer = named.filter((c) =>
      mayBeSameServer(serverKey, c.serverKey),
    );
    const existing =
      named.find((c) => c.serverKey === serverKey) ??
      named.find((c) => c.serverKey === null) ??
      (anyServer.length === 1 ? anyServer[0] : undefined);
    if (existing) {
      return {
        existing,
        renamesFrom: match === "firstName" ? existing.name : null,
      };
    }
  }
  return { existing: undefined, renamesFrom: null };
}

function nothingChanges() {
  return {
    characterId: null,
    changedFields: [],
    professions: [],
    missingProfessionEntryIds: [],
    newRecipes: [],
    deathsToAdd: 0,
    addonDeathCount: null,
  };
}

function changedFieldsOf(
  existing: OwnCharacterState,
  values: CharacterPreview["values"],
): CharacterField[] {
  const fields: Array<[CharacterField, number | null, number | null]> = [
    ["faction", values.factionEntryId, existing.factionEntryId],
    ["race", values.raceEntryId, existing.raceEntryId],
    ["class", values.classEntryId, existing.classEntryId],
    ["level", values.level, existing.level],
  ];
  return fields
    .filter(([, next, previous]) => next !== null && next !== previous)
    .map(([field]) => field);
}

/**
 * The addon counts deaths since its installation, GuildHub counts all of them, partly
 * entered by hand. So only what the addon counted since the last import is added; a
 * count lower than last time means the addon started over (SPEC 7.3).
 */
function deathsToAdd(
  catalog: GameCatalog,
  exported: ExportedCharacter,
  existing: OwnCharacterState | undefined,
): { add: number; addonDeathCount: number | null } {
  if (!catalog.game.meta.capabilities.death_count || exported.deaths === null) {
    return { add: 0, addonDeathCount: existing?.addonDeathCount ?? null };
  }
  const previous = existing?.addonDeathCount ?? 0;
  return {
    add:
      exported.deaths >= previous
        ? exported.deaths - previous
        : exported.deaths,
    addonDeathCount: exported.deaths,
  };
}

/** Looks up the game's own names (game_ref) and spell IDs in the pack catalog. */
class GameRefs {
  private readonly byRef = new Map<string, CatalogEntry>();
  private readonly withRef = new Set<number>();
  private readonly recipesByKey: Map<string, CatalogEntry>;

  public constructor(private readonly catalog: GameCatalog) {
    for (const kind of REF_KINDS) {
      for (const entry of catalogOfKind(catalog, kind)) {
        const ref = entry.data.game_ref;
        if (typeof ref === "string") {
          this.byRef.set(`${kind}:${ref}`, entry);
          this.withRef.add(entry.id);
        }
      }
    }
    this.recipesByKey = new Map(
      catalogOfKind(catalog, "recipe").map((entry) => [entry.key, entry]),
    );
  }

  public entryId(
    kind: RefKind,
    ref: string | null,
    unknown: UnknownValue[],
  ): number | null {
    return ref === null ? null : (this.lookup(kind, ref, unknown)?.id ?? null);
  }

  public hasGameRef(entryId: number): boolean {
    return this.withRef.has(entryId);
  }

  public professions(exported: ExportedCharacter, unknown: UnknownValue[]) {
    return exported.professions.flatMap((profession) => {
      const entry = this.lookup("profession", profession.ref, unknown);
      return entry
        ? [
            {
              entry,
              skillLevel: profession.skill,
              spellIds: profession.spellIds,
            },
          ]
        : [];
    });
  }

  private lookup(
    kind: RefKind,
    ref: string,
    unknown: UnknownValue[],
  ): CatalogEntry | undefined {
    const entry = this.byRef.get(`${kind}:${ref}`);
    if (!entry) {
      unknown.push({ kind, ref });
    }
    return entry;
  }

  public recipes(
    professions: ReturnType<GameRefs["professions"]>,
    unknown: UnknownValue[],
  ): NewRecipe[] {
    let missing = 0;
    const recipes = professions.flatMap(({ entry, spellIds }) =>
      spellIds.flatMap((spellId) => {
        const recipe = this.recipesByKey.get(recipeKey(entry.key, spellId));
        if (!recipe) {
          missing += 1;
          return [];
        }
        return [
          {
            professionEntryId: entry.id,
            recipeEntryId: recipe.id,
            name: recipe.name,
          },
        ];
      }),
    );
    if (missing > 0) {
      unknown.push({ kind: "recipes", count: missing });
    }
    return recipes;
  }

  public serverKey(realm: string, unknown: UnknownValue[]): string | null {
    const resolved = resolveServerKey(this.catalog, realm);
    if (resolved.unknownRealm) {
      unknown.push({ kind: "realm", ref: realm });
    }
    return resolved.serverKey;
  }
}

/** The server a realm name of the game stands for in GuildHub. */
export function resolveServerKey(
  catalog: GameCatalog,
  realm: string,
): { serverKey: string | null; unknownRealm: boolean } {
  if (!catalog.game.meta.capabilities.servers || realm.trim() === "") {
    return { serverKey: null, unknownRealm: false };
  }
  const servers = catalogOfKind(catalog, "server");
  if (servers.length === 0) {
    return { serverKey: normalizeServerKey(realm), unknownRealm: false };
  }
  const wanted = realm.toLowerCase();
  const entry = servers.find((server) =>
    allTranslations(server.name).some((name) => name.toLowerCase() === wanted),
  );
  return { serverKey: entry?.key ?? null, unknownRealm: !entry };
}
