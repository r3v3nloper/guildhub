import { adler32 } from "./adler32";

// The frame around everything the addon and GuildHub hand each other (SPEC 7.3):
// GH<version>:<game_id>:<kind>:<checksum>:<payload>. The checksum covers game, kind and
// payload, so a string cut short while copying is caught before anything is read.

export const ADDON_FORMAT_VERSION = 1;
/** The current version and the one before, so not everybody has to update at once. */
const ACCEPTED_VERSIONS = [ADDON_FORMAT_VERSION];

export const ADDON_STRING_KINDS = ["export", "guild"] as const;
export type AddonStringKind = (typeof ADDON_STRING_KINDS)[number];

export interface AddonString {
  gameId: string;
  kind: AddonStringKind;
  payload: string;
}

export type DecodeResult =
  { ok: true; value: AddonString } | { ok: false; error: string };

/** The longest string the import accepts; a whole account with every recipe stays far below. */
export const ADDON_STRING_MAX_LENGTH = 2_000_000;

const FRAME = /^GH(\d+):([a-z0-9-]+):([a-z]+):([0-9a-f]{8}):(.*)$/;

export function encodeAddonString({
  gameId,
  kind,
  payload,
}: AddonString): string {
  const checksum = adler32(`${gameId}:${kind}:${payload}`);
  return `GH${ADDON_FORMAT_VERSION}:${gameId}:${kind}:${checksum}:${payload}`;
}

export function decodeAddonString(
  text: string,
  expected: { gameId: string; kind: AddonStringKind },
): DecodeResult {
  // Edit boxes in the game wrap long lines; the payload itself never contains a newline.
  const cleaned = text.replace(/[\r\n]/g, "").trim();
  if (cleaned.length > ADDON_STRING_MAX_LENGTH) {
    return { ok: false, error: "Der Text ist zu lang." };
  }
  const match = FRAME.exec(cleaned);
  if (!match) {
    return {
      ok: false,
      error:
        "Das ist kein Text aus dem GuildHub-Addon. Bitte komplett kopieren.",
    };
  }
  const [, version, gameId, kind, checksum, payload] = match;
  if (!ACCEPTED_VERSIONS.includes(Number(version))) {
    return {
      ok: false,
      error:
        "Diese Addon-Version passt nicht zu GuildHub. Bitte das Addon aktualisieren.",
    };
  }
  if (adler32(`${gameId}:${kind}:${payload}`) !== checksum) {
    return {
      ok: false,
      error:
        "Der Text ist unvollständig oder verändert. Bitte erneut komplett kopieren.",
    };
  }
  if (gameId !== expected.gameId) {
    return { ok: false, error: "Der Text gehört zu einem anderen Spiel." };
  }
  if (kind !== expected.kind) {
    return {
      ok: false,
      error:
        kind === "guild"
          ? "Das ist der Gilden-Stand, er gehört ins Addon."
          : "Das ist kein Gilden-Stand, sondern ein Export aus dem Addon.",
    };
  }
  return { ok: true, value: { gameId, kind: expected.kind, payload } };
}
