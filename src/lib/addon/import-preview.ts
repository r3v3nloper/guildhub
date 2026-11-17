import { allTranslations } from "@/i18n/localize";
import type { CatalogKind } from "@/lib/packs/catalog";
import type { LocalizedString } from "@/lib/packs/schema";
import {
  catalogOfKind,
  type CatalogEntry,
  type GameCatalog,
} from "@/lib/roster/game-catalog";
import { normalizeServerKey } from "@/lib/roster/server-name";
import type { CharacterExport, ExportedCharacter } from "./export-payload";

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
  changedFields: CharacterField[];
  professions: ProfessionChange[];
  /** Professions the character has in GuildHub, but no longer in the game. */
  missingProfessionEntryIds: number[];
  newRecipes: NewRecipe[];
  deathsToAdd: number;
  addonDeathCount: number | null;
  /** What the pack does not know, in words for the preview. */
  unknown: string[];
}

export interface PreviewInput {
  catalog: GameCatalog;
  data: CharacterExport;
  own: readonly OwnCharacterState[];
  foreign: readonly ForeignCharacter[];
}

export function previewCharacterImport({
  catalog,
  data,
  own,
  foreign,
}: PreviewInput): CharacterPreview[] {
  const refs = new GameRefs(catalog);
  return data.characters.map((character) =>
    previewCharacter(character, refs, catalog, own, foreign),
  );
}

function previewCharacter(
  exported: ExportedCharacter,
  refs: GameRefs,
  catalog: GameCatalog,
  own: readonly OwnCharacterState[],
  foreign: readonly ForeignCharacter[],
): CharacterPreview {
  const unknown: string[] = [];
  const serverKey = refs.serverKey(exported.realm, unknown);
  const sameName = (name: string) =>
    name.toLowerCase() === exported.name.toLowerCase();
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
  };

  if (foreign.some((c) => sameName(c.name) && c.serverKey === serverKey)) {
    return { ...base, ...nothingChanges(), status: "foreign", previous: null };
  }

  // A character entered without a server is the same one; the import fills the server in.
  const existing =
    own.find((c) => sameName(c.name) && c.serverKey === serverKey) ??
    own.find((c) => sameName(c.name) && c.serverKey === null);

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
  const missingProfessionEntryIds = (existing?.professions ?? [])
    .map((p) => p.entryId)
    .filter((entryId) => !keptIds.has(entryId) && refs.hasGameRef(entryId));

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
  const fillsInServer = existing.serverKey !== serverKey;
  const changed =
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
    for (const kind of ["faction", "race", "class", "profession"] as const) {
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
    kind: CatalogKind,
    ref: string | null,
    unknown: string[],
  ): number | null {
    return ref === null ? null : (this.lookup(kind, ref, unknown)?.id ?? null);
  }

  public hasGameRef(entryId: number): boolean {
    return this.withRef.has(entryId);
  }

  public professions(exported: ExportedCharacter, unknown: string[]) {
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
    kind: CatalogKind,
    ref: string,
    unknown: string[],
  ): CatalogEntry | undefined {
    const entry = this.byRef.get(`${kind}:${ref}`);
    if (!entry) {
      unknown.push(`${KIND_LABELS[kind]} „${ref}“`);
    }
    return entry;
  }

  public recipes(
    professions: ReturnType<GameRefs["professions"]>,
    unknown: string[],
  ): NewRecipe[] {
    let missing = 0;
    const recipes = professions.flatMap(({ entry, spellIds }) =>
      spellIds.flatMap((spellId) => {
        // Pack recipe IDs carry the profession, as a few spells belong to two of them.
        const recipe = this.recipesByKey.get(`${entry.key}-${spellId}`);
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
      unknown.push(`${missing} Rezepte ohne Eintrag im Pack`);
    }
    return recipes;
  }

  public serverKey(realm: string, unknown: string[]): string | null {
    if (!this.catalog.game.meta.capabilities.servers) {
      return null;
    }
    const servers = catalogOfKind(this.catalog, "server");
    if (servers.length === 0) {
      return normalizeServerKey(realm);
    }
    const wanted = realm.toLowerCase();
    const entry = servers.find((server) =>
      allTranslations(server.name).some(
        (name) => name.toLowerCase() === wanted,
      ),
    );
    if (!entry) {
      unknown.push(`Realm „${realm}“`);
    }
    return entry?.key ?? null;
  }
}

const KIND_LABELS: Partial<Record<CatalogKind, string>> = {
  faction: "Fraktion",
  race: "Rasse",
  class: "Klasse",
  profession: "Beruf",
};
