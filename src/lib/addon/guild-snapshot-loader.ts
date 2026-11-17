import { and, eq, inArray } from "drizzle-orm";
import type { Actor } from "@/lib/auth/guards";
import { listMembers } from "@/lib/auth/membership";
import type { AppDatabase } from "@/lib/db/client";
import {
  characterProfessions,
  characters,
  craftRequests,
  recipeEntries,
} from "@/lib/db/schema";
import { NotFoundError } from "@/lib/errors";
import { catalogOfKind, isGameEnabled } from "@/lib/roster/game-catalog";
import { requireAddonCatalog } from "./addon-catalog";
import { encodeAddonString } from "./addon-string";
import {
  formatGuildSnapshot,
  type GuildSnapshot,
  type SnapshotRequest,
} from "./guild-snapshot";

/**
 * The guild snapshot for the addon, made for the actor (SPEC 7.3). It holds only what
 * every member sees in GuildHub anyway: active members' characters with their pack
 * recipes, and the requests that are not done yet. Free-text recipes have no spell ID
 * and stay out.
 */
export function buildGuildSnapshot(
  db: AppDatabase,
  actor: Actor,
  gameId: string,
): string {
  const catalog = requireAddonCatalog(db, gameId);
  if (!isGameEnabled(db, actor.guildId, gameId)) {
    throw new NotFoundError("Spiel");
  }

  const professionRefs = new Map(
    catalogOfKind(catalog, "profession")
      .filter((entry) => typeof entry.data.game_ref === "string")
      .map((entry) => [entry.id, entry.data.game_ref as string]),
  );
  const spellIds = new Map(
    catalogOfKind(catalog, "recipe").map((entry) => [
      entry.id,
      // Pack recipe IDs are "<profession>-<spell id>" (ForeverDB import).
      Number(entry.key.slice(String(entry.data.profession).length + 1)),
    ]),
  );

  const members = listMembers(db, actor.guildId).filter(
    (member) => member.status === "active",
  );
  const memberNumbers = new Map(
    members.map((member, index) => [member.userId, index + 1]),
  );

  const characterRows = db
    .select()
    .from(characters)
    .where(
      and(
        eq(characters.gameId, gameId),
        inArray(characters.userId, [...memberNumbers.keys()]),
      ),
    )
    .orderBy(characters.name)
    .all();
  const characterIds = characterRows.map((row) => row.id);
  const professionRows = characterIds.length
    ? db
        .select()
        .from(characterProfessions)
        .where(inArray(characterProfessions.characterId, characterIds))
        .all()
    : [];
  const recipeRows = characterIds.length
    ? db
        .select()
        .from(recipeEntries)
        .where(inArray(recipeEntries.characterId, characterIds))
        .all()
    : [];

  const professionsOf = (characterId: number) =>
    professionRows
      .filter(
        (row) =>
          row.characterId === characterId &&
          professionRefs.has(row.professionEntryId),
      )
      .map((row) => ({
        ref: professionRefs.get(row.professionEntryId)!,
        skill: row.skillLevel,
        spellIds: recipeRows
          .filter(
            (recipe) =>
              recipe.characterId === characterId &&
              recipe.professionEntryId === row.professionEntryId &&
              recipe.recipeEntryId !== null,
          )
          .map((recipe) => spellIds.get(recipe.recipeEntryId!))
          .filter(
            (id): id is number => id !== undefined && Number.isInteger(id),
          )
          .sort((a, b) => a - b),
      }));

  const snapshot: GuildSnapshot = {
    createdAt: new Date(),
    self: memberNumbers.get(actor.userId) ?? 0,
    members: members.map((member) => ({
      characters: characterRows
        .filter((row) => row.userId === member.userId)
        .map((row) => ({
          realm: row.serverName ?? "",
          name: row.name,
          professions: professionsOf(row.id),
        })),
    })),
    requests: loadRequests(db, gameId, memberNumbers, professionRefs, spellIds),
  };
  return encodeAddonString({
    gameId,
    kind: "guild",
    payload: formatGuildSnapshot(snapshot),
  });
}

function loadRequests(
  db: AppDatabase,
  gameId: string,
  memberNumbers: ReadonlyMap<string, number>,
  professionRefs: ReadonlyMap<number, string>,
  spellIds: ReadonlyMap<number, number>,
): SnapshotRequest[] {
  return db
    .select()
    .from(craftRequests)
    .where(
      and(
        eq(craftRequests.gameId, gameId),
        inArray(craftRequests.status, ["open", "accepted"]),
      ),
    )
    .orderBy(craftRequests.id)
    .all()
    .flatMap((request): SnapshotRequest[] => {
      const requester = memberNumbers.get(request.requesterId);
      const professionRef = professionRefs.get(request.professionEntryId);
      // Requests of former members, or for professions the game cannot name, stay out.
      if (requester === undefined || professionRef === undefined) {
        return [];
      }
      return [
        {
          id: request.id,
          status: request.status as SnapshotRequest["status"],
          requester,
          crafter:
            request.crafterId === null
              ? null
              : (memberNumbers.get(request.crafterId) ?? null),
          professionRef,
          spellId:
            request.recipeEntryId === null
              ? null
              : (spellIds.get(request.recipeEntryId) ?? null),
          quantity: request.quantity,
          item: request.item,
          notes: request.notes,
        },
      ];
    });
}
