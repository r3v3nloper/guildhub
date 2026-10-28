import type { CatalogKind } from "@/lib/packs/catalog";
import { localize } from "@/i18n/localize";
import {
  catalogOfKind,
  type CatalogEntry,
  type GameCatalog,
} from "./game-catalog";
import { classFitsFaction, classFitsRace } from "./class-restrictions";
import { cleanServerName, normalizeServerKey } from "./server-name";

export interface CharacterInput {
  name: string;
  server: string;
  factionKey: string;
  raceKey: string;
  classKey: string;
  spec: string;
  level: number | null;
  isMain: boolean;
  notes: string;
  professionKeys: string[];
}

/** The stored state of a character being edited, so unchanged legacy values stay valid. */
export interface PreviousSelection {
  factionEntryId: number | null;
  raceEntryId: number | null;
  classEntryId: number | null;
  serverKey: string | null;
  professionEntryIds: number[];
}

export interface ResolvedCharacter {
  name: string;
  serverKey: string | null;
  serverName: string | null;
  factionEntryId: number | null;
  raceEntryId: number | null;
  classEntryId: number | null;
  spec: string | null;
  level: number | null;
  isMain: boolean;
  notes: string | null;
  professionEntryIds: number[];
}

export type FieldErrors = Partial<Record<keyof CharacterInput, string>>;

export type ResolveResult =
  { ok: true; value: ResolvedCharacter } | { ok: false; errors: FieldErrors };

const NAME_MAX_LENGTH = 40;
const LEVEL_MAX = 1000;

const NO_PREVIOUS: PreviousSelection = {
  factionEntryId: null,
  raceEntryId: null,
  classEntryId: null,
  serverKey: null,
  professionEntryIds: [],
};

/**
 * Turns form input into storable values and enforces SPEC 4.5/4.7 on create and edit.
 * Restrictions are only checked when the combination changes, never retroactively.
 */
export function resolveCharacter(
  catalog: GameCatalog,
  input: CharacterInput,
  previous: PreviousSelection = NO_PREVIOUS,
): ResolveResult {
  const capabilities = catalog.game.meta.capabilities;
  const errors: FieldErrors = {};

  const name = input.name.trim();
  if (name.length === 0) {
    errors.name = "Name fehlt.";
  } else if (name.length > NAME_MAX_LENGTH) {
    errors.name = `Höchstens ${NAME_MAX_LENGTH} Zeichen.`;
  }

  if (
    input.level !== null &&
    (!Number.isInteger(input.level) ||
      input.level < 1 ||
      input.level > LEVEL_MAX)
  ) {
    errors.level = `Stufe zwischen 1 und ${LEVEL_MAX}.`;
  }

  const pick = (
    kind: CatalogKind,
    key: string,
    previousId: number | null,
    field: keyof CharacterInput,
  ): CatalogEntry | null => {
    if (!key) {
      return null;
    }
    const entry = catalogOfKind(catalog, kind).find((e) => e.key === key);
    if (!entry || (entry.status !== "active" && entry.id !== previousId)) {
      errors[field] = "Nicht auswählbar.";
      return null;
    }
    return entry;
  };

  const race = capabilities.races
    ? pick("race", input.raceKey, previous.raceEntryId, "raceKey")
    : null;
  if (capabilities.races && !input.raceKey && hasEntries(catalog, "race")) {
    errors.raceKey = "Rasse wählen.";
  }

  let faction: CatalogEntry | null = null;
  if (capabilities.factions && capabilities.races) {
    const factionKey = race?.data.faction;
    faction =
      typeof factionKey === "string"
        ? (catalogOfKind(catalog, "faction").find(
            (e) => e.key === factionKey,
          ) ?? null)
        : null;
  } else if (capabilities.factions) {
    faction = pick(
      "faction",
      input.factionKey,
      previous.factionEntryId,
      "factionKey",
    );
    if (!input.factionKey && hasEntries(catalog, "faction")) {
      errors.factionKey = "Fraktion wählen.";
    }
  }

  const characterClass = capabilities.classes
    ? pick("class", input.classKey, previous.classEntryId, "classKey")
    : null;
  if (capabilities.classes && !input.classKey && hasEntries(catalog, "class")) {
    errors.classKey = "Klasse wählen.";
  }

  const combinationChanged =
    (faction?.id ?? null) !== previous.factionEntryId ||
    (race?.id ?? null) !== previous.raceEntryId ||
    (characterClass?.id ?? null) !== previous.classEntryId;
  if (combinationChanged && characterClass) {
    const restrictedClass = {
      key: characterClass.key,
      factions: stringList(characterClass.data.factions),
    };
    if (faction && !classFitsFaction(restrictedClass, faction.key)) {
      errors.classKey = `${localize(characterClass.name)} gibt es nicht bei ${localize(faction.name)}.`;
    }
    if (
      race &&
      !classFitsRace(restrictedClass, {
        allowedClasses: stringList(race.data.allowed_classes),
      })
    ) {
      errors.classKey = `${localize(race.name)} kann nicht ${localize(characterClass.name)} sein.`;
    }
  }

  const server = resolveServer(
    catalog,
    input.server,
    previous.serverKey,
    errors,
  );

  const professionEntryIds: number[] = [];
  if (capabilities.professions) {
    for (const key of new Set(input.professionKeys.filter(Boolean))) {
      const entry = catalogOfKind(catalog, "profession").find(
        (e) => e.key === key,
      );
      if (
        !entry ||
        (entry.status !== "active" &&
          !previous.professionEntryIds.includes(entry.id))
      ) {
        errors.professionKeys = "Beruf nicht auswählbar.";
        continue;
      }
      professionEntryIds.push(entry.id);
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      name,
      ...server,
      factionEntryId: faction?.id ?? null,
      raceEntryId: race?.id ?? null,
      classEntryId: characterClass?.id ?? null,
      spec: optionalText(input.spec),
      level: input.level,
      isMain: input.isMain,
      notes: optionalText(input.notes),
      professionEntryIds,
    },
  };
}

function resolveServer(
  catalog: GameCatalog,
  input: string,
  previousKey: string | null,
  errors: FieldErrors,
): { serverKey: string | null; serverName: string | null } {
  if (!catalog.game.meta.capabilities.servers || !input.trim()) {
    return { serverKey: null, serverName: null };
  }

  const servers = catalogOfKind(catalog, "server");
  if (servers.length === 0) {
    return {
      serverKey: normalizeServerKey(input),
      serverName: cleanServerName(input),
    };
  }

  const entry = servers.find((e) => e.key === input);
  if (!entry || (entry.status !== "active" && entry.key !== previousKey)) {
    errors.server = "Server nicht auswählbar.";
    return { serverKey: null, serverName: null };
  }
  return { serverKey: entry.key, serverName: null };
}

function hasEntries(catalog: GameCatalog, kind: CatalogKind): boolean {
  return catalogOfKind(catalog, kind).length > 0;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function optionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export interface CharacterHint {
  field: "classKey" | "raceKey" | "factionKey" | "professionKeys";
  message: string;
}

/** Notes shown in the editor when pack updates left a character outdated (SPEC 4.7, 6.5 B). */
export function characterHints(
  catalog: GameCatalog,
  selection: PreviousSelection,
): CharacterHint[] {
  const capabilities = catalog.game.meta.capabilities;
  const hints: CharacterHint[] = [];
  const byId = new Map(catalog.entries.map((entry) => [entry.id, entry]));

  const check = (
    field: CharacterHint["field"],
    enabled: boolean,
    entryId: number | null,
    missingMessage: string,
    required: boolean,
  ) => {
    if (!enabled) {
      return;
    }
    const entry = entryId === null ? undefined : byId.get(entryId);
    if (!entry) {
      if (required) {
        hints.push({ field, message: missingMessage });
      }
      return;
    }
    if (entry.status === "removed") {
      hints.push({
        field,
        message: `„${localize(entry.name)}“ ist nicht mehr im Pack. Bitte neu wählen.`,
      });
    } else if (entry.status === "deprecated") {
      hints.push({
        field,
        message: `„${localize(entry.name)}“ ist veraltet und für neue Charaktere nicht mehr wählbar.`,
      });
    }
  };

  check(
    "classKey",
    capabilities.classes,
    selection.classEntryId,
    "Klasse wählen.",
    true,
  );
  check(
    "raceKey",
    capabilities.races,
    selection.raceEntryId,
    "Rasse wählen.",
    true,
  );
  check(
    "factionKey",
    capabilities.factions && !capabilities.races,
    selection.factionEntryId,
    "Fraktion wählen.",
    true,
  );
  for (const id of selection.professionEntryIds) {
    check("professionKeys", capabilities.professions, id, "", false);
  }
  return hints;
}
