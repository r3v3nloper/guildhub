// The payload of a character export (SPEC 7.3): records separated by ";", fields by ",".
//   C,<realm>,<name>,<faction>,<race>,<class>,<level>,<deaths>   starts a character
//   P,<profession>,<skill>[,<spell id>…]                        a profession of that character
//   A,<request id>,<accept|done|return>,<unix seconds>          a crafting request action
// Faction, race, class and profession are the game's own names (game_ref in the pack).
// Character and realm names never contain the separators, so nothing needs escaping.
// Unknown record types are skipped, so a newer addon can add some without a new version.

export const REQUEST_ACTIONS = ["accept", "done", "return"] as const;
export type RequestAction = (typeof REQUEST_ACTIONS)[number];

export interface ExportedProfession {
  ref: string;
  skill: number | null;
  spellIds: number[];
}

export interface ExportedCharacter {
  realm: string;
  name: string;
  factionRef: string | null;
  raceRef: string | null;
  classRef: string | null;
  level: number | null;
  /** Deaths the addon counted since it was installed. */
  deaths: number | null;
  professions: ExportedProfession[];
}

export interface ExportedRequestAction {
  requestId: number;
  action: RequestAction;
  at: Date;
}

export interface CharacterExport {
  characters: ExportedCharacter[];
  requestActions: ExportedRequestAction[];
}

export type ParseResult =
  { ok: true; value: CharacterExport } | { ok: false; error: string };

const MAX_CHARACTERS = 50;
const MAX_ACTIONS = 500;
const MAX_NAME_LENGTH = 40;

class PayloadError extends Error {}

export function parseCharacterExport(payload: string): ParseResult {
  try {
    return { ok: true, value: readRecords(payload) };
  } catch (error) {
    if (error instanceof PayloadError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}

function readRecords(payload: string): CharacterExport {
  const result: CharacterExport = { characters: [], requestActions: [] };
  const records = payload.split(";").filter((record) => record !== "");
  for (const [index, record] of records.entries()) {
    const [type, ...fields] = record.split(",");
    const where = `Eintrag ${index + 1}`;
    if (type === "C") {
      result.characters.push(readCharacter(fields, where));
    } else if (type === "P") {
      const character = result.characters.at(-1);
      if (!character) {
        throw new PayloadError(`${where}: Beruf ohne Charakter.`);
      }
      character.professions.push(readProfession(fields, where));
    } else if (type === "A") {
      result.requestActions.push(readAction(fields, where));
    }
  }
  if (result.characters.length > MAX_CHARACTERS) {
    throw new PayloadError(`Höchstens ${MAX_CHARACTERS} Charaktere.`);
  }
  if (result.requestActions.length > MAX_ACTIONS) {
    throw new PayloadError(`Höchstens ${MAX_ACTIONS} Antrags-Aktionen.`);
  }
  return result;
}

function readCharacter(fields: string[], where: string): ExportedCharacter {
  const [realm, name, faction, race, klass, level, deaths] = fields;
  if (!name?.trim() || name.length > MAX_NAME_LENGTH) {
    throw new PayloadError(`${where}: Charaktername fehlt oder ist zu lang.`);
  }
  if (!realm?.trim() || realm.length > MAX_NAME_LENGTH) {
    throw new PayloadError(`${where}: Realm fehlt oder ist zu lang.`);
  }
  return {
    realm: realm.trim(),
    name: name.trim(),
    factionRef: faction || null,
    raceRef: race || null,
    classRef: klass || null,
    level: optionalCount(level, where),
    deaths: optionalCount(deaths, where),
    professions: [],
  };
}

function readProfession(fields: string[], where: string): ExportedProfession {
  const [ref, skill, ...spellIds] = fields;
  if (!ref) {
    throw new PayloadError(`${where}: Beruf fehlt.`);
  }
  return {
    ref,
    skill: optionalCount(skill, where),
    spellIds: spellIds.map((spellId) => requiredCount(spellId, where)),
  };
}

function readAction(fields: string[], where: string): ExportedRequestAction {
  const [requestId, action, at] = fields;
  if (!REQUEST_ACTIONS.includes(action as RequestAction)) {
    throw new PayloadError(`${where}: unbekannte Antrags-Aktion.`);
  }
  return {
    requestId: positiveId(requestId, where),
    action: action as RequestAction,
    at: new Date(requiredCount(at, where) * 1000),
  };
}

// Ten digits fit Unix seconds and stay far below Number.MAX_SAFE_INTEGER.
const COUNT = /^\d{1,10}$/;

function optionalCount(
  value: string | undefined,
  where: string,
): number | null {
  return value ? requiredCount(value, where) : null;
}

function requiredCount(value: string | undefined, where: string): number {
  if (!value || !COUNT.test(value)) {
    throw new PayloadError(`${where}: ungültige Zahl.`);
  }
  return Number(value);
}

function positiveId(value: string | undefined, where: string): number {
  const id = requiredCount(value, where);
  if (id === 0) {
    throw new PayloadError(`${where}: ungültiger Antrag.`);
  }
  return id;
}
