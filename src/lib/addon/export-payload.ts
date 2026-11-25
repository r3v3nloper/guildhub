// The payload of a character export (SPEC 7.3): records separated by ";", fields by ",".
//   C,<realm>,<name>,<faction>,<race>,<class>,<level>,<deaths>   starts a character
//   P,<profession>,<skill>[,<spell id>…]                        a profession of that character
//   A,<request id>,<accept|done|return>,<unix seconds>          a crafting request action
//   O,<account id>                                              the exporting account
//   U,<account id>,<unix seconds>    starts a block another account's addon passed on in
//                                    the game (SPEC 7.3.3); C, P and A after it belong to it
// Records before the first U, and a U block of the exporting account, are its own data.
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

export interface ExportedAccount {
  accountId: string;
  /** When the account's addon last changed the block. */
  updatedAt: Date;
  characters: ExportedCharacter[];
  requestActions: ExportedRequestAction[];
}

export interface CharacterExport {
  characters: ExportedCharacter[];
  requestActions: ExportedRequestAction[];
  /** Blocks of other accounts, passed on in the game. */
  relayed: ExportedAccount[];
}

export type ParseResult =
  { ok: true; value: CharacterExport } | { ok: false; error: string };

const MAX_CHARACTERS = 50;
const MAX_ACTIONS = 500;
const MAX_NAME_LENGTH = 40;
const MAX_RELAYED_ACCOUNTS = 200;
const ACCOUNT_ID = /^[0-9a-z]{6,32}$/;

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

type Block = Pick<ExportedAccount, "characters" | "requestActions">;

function readRecords(payload: string): CharacterExport {
  const records = payload
    .split(";")
    .filter((record) => record !== "")
    .map((record, index) => ({
      fields: record.split(","),
      where: `Eintrag ${index + 1}`,
    }));
  const ownAccountId = records
    .filter(({ fields }) => fields[0] === "O")
    .map(({ fields, where }) => accountId(fields[1], where))
    .at(-1);
  const result: CharacterExport = {
    characters: [],
    requestActions: [],
    relayed: [],
  };
  let block: Block = result;
  for (const {
    fields: [type, ...fields],
    where,
  } of records) {
    if (type === "U") {
      block = startAccount(result, fields, where, ownAccountId);
    } else if (type === "C") {
      block.characters.push(readCharacter(fields, where));
    } else if (type === "P") {
      const character = block.characters.at(-1);
      if (!character) {
        throw new PayloadError(`${where}: Beruf ohne Charakter.`);
      }
      character.professions.push(readProfession(fields, where));
    } else if (type === "A") {
      block.requestActions.push(readAction(fields, where));
    }
  }
  if (result.relayed.length > MAX_RELAYED_ACCOUNTS) {
    throw new PayloadError(`Höchstens ${MAX_RELAYED_ACCOUNTS} Accounts.`);
  }
  for (const each of [result, ...result.relayed]) {
    checkLimits(each);
  }
  return result;
}

/** The block the following records belong to; the exporting account's own is the top level. */
function startAccount(
  result: CharacterExport,
  fields: string[],
  where: string,
  ownAccountId: string | undefined,
): Block {
  const id = accountId(fields[0], where);
  if (id === ownAccountId) {
    return result;
  }
  const known = result.relayed.find((account) => account.accountId === id);
  if (known) {
    return known;
  }
  const account: ExportedAccount = {
    accountId: id,
    updatedAt: new Date(requiredCount(fields[1], where) * 1000),
    characters: [],
    requestActions: [],
  };
  result.relayed.push(account);
  return account;
}

function checkLimits(block: Block): void {
  if (block.characters.length > MAX_CHARACTERS) {
    throw new PayloadError(
      `Höchstens ${MAX_CHARACTERS} Charaktere je Account.`,
    );
  }
  if (block.requestActions.length > MAX_ACTIONS) {
    throw new PayloadError(
      `Höchstens ${MAX_ACTIONS} Antrags-Aktionen je Account.`,
    );
  }
}

function accountId(value: string | undefined, where: string): string {
  if (!value || !ACCOUNT_ID.test(value)) {
    throw new PayloadError(`${where}: ungültige Account-Kennung.`);
  }
  return value;
}

function readCharacter(fields: string[], where: string): ExportedCharacter {
  const [realm, name, faction, race, klass, level, deaths] = fields;
  if (!name?.trim() || name.length > MAX_NAME_LENGTH) {
    throw new PayloadError(`${where}: Charaktername fehlt oder ist zu lang.`);
  }
  // WoW Forever 1.60.1 names no realm to addons, so the field may be empty.
  if (realm === undefined || realm.length > MAX_NAME_LENGTH) {
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
