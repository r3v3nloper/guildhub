// The guild snapshot GuildHub hands the addon (SPEC 7.3): who in the guild can craft
// what, and the open and accepted crafting requests. Records separated by ";", fields
// by ","; free text is percent-encoded, so it may contain anything.
//   T,<unix seconds>                                   when the snapshot was made
//   S,<member>                                         the member it was made for
//   M                                                  starts a member (numbered from 1)
//   C,<realm>,<name>                                   a character of that member
//   K,<profession>,<skill>[,<spell id>…]               a profession of that character
//   R,<id>,<status>,<requester>,<crafter>,<profession>,<spell id>,<quantity>,<item>,<notes>
// Professions are the game's skill line IDs (game_ref), members their numbers above.

export interface SnapshotProfession {
  ref: string;
  skill: number | null;
  spellIds: number[];
}

export interface SnapshotCharacter {
  realm: string;
  name: string;
  professions: SnapshotProfession[];
}

export interface SnapshotRequest {
  id: number;
  status: "open" | "accepted";
  /** Member numbers, counted from 1 in the order of `members`. */
  requester: number;
  crafter: number | null;
  professionRef: string;
  spellId: number | null;
  quantity: number;
  item: string;
  notes: string | null;
}

export interface GuildSnapshot {
  createdAt: Date;
  self: number;
  members: Array<{ characters: SnapshotCharacter[] }>;
  requests: SnapshotRequest[];
}

/** Percent-encodes the separators and the escape itself; Lua decodes with one gsub. */
export function escapeField(text: string): string {
  return text.replace(
    /[%,;:\r\n]/g,
    (character) =>
      `%${character.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`,
  );
}

type Field = string | number | null;
type SnapshotRecord = [type: string, ...fields: Field[]];

const field = (value: Field) =>
  value === null
    ? ""
    : typeof value === "number"
      ? String(value)
      : escapeField(value);

export function formatGuildSnapshot(snapshot: GuildSnapshot): string {
  const records: SnapshotRecord[] = [
    ["T", Math.floor(snapshot.createdAt.getTime() / 1000)],
    ["S", snapshot.self],
  ];
  for (const member of snapshot.members) {
    records.push(["M"]);
    for (const character of member.characters) {
      records.push(["C", character.realm, character.name]);
      for (const profession of character.professions) {
        records.push([
          "K",
          profession.ref,
          profession.skill,
          ...profession.spellIds,
        ]);
      }
    }
  }
  for (const request of snapshot.requests) {
    records.push([
      "R",
      request.id,
      request.status,
      request.requester,
      request.crafter,
      request.professionRef,
      request.spellId,
      request.quantity,
      request.item,
      request.notes,
    ]);
  }
  return records
    .map(([type, ...fields]) => [type, ...fields.map(field)].join(","))
    .join(";");
}
