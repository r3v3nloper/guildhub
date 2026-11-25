import { eq } from "drizzle-orm";
import { permissions, type Actor } from "@/lib/auth/guards";
import { listMembers } from "@/lib/auth/membership";
import type { AppDatabase } from "@/lib/db/client";
import { characters } from "@/lib/db/schema";
import type { GameCatalog } from "@/lib/roster/game-catalog";
import type { ExportedAccount } from "./export-payload";
import { resolveServerKey } from "./import-preview";

// Which member a block another account's addon passed on in the game belongs to
// (SPEC 7.3.3). GuildHub links characters to members, not WoW accounts, so the
// characters of the account it already knows decide.

export type SkipReason =
  "notOfficer" | "unknownCharacters" | "severalMembers" | "inactiveMember";

export type RelayedAssignment =
  | { account: ExportedAccount; member: { actor: Actor; name: string } }
  | { account: ExportedAccount; skipped: SkipReason };

export function assignRelayedAccounts(
  db: AppDatabase,
  actor: Actor,
  catalog: GameCatalog,
  relayed: readonly ExportedAccount[],
): RelayedAssignment[] {
  if (!permissions.importForMembers(actor).allowed) {
    return relayed.map((account) => ({ account, skipped: "notOfficer" }));
  }
  const known = db
    .select({
      userId: characters.userId,
      name: characters.name,
      serverKey: characters.serverKey,
    })
    .from(characters)
    .where(eq(characters.gameId, catalog.game.id))
    .all();
  const members = new Map(
    listMembers(db, actor.guildId).map((member) => [member.userId, member]),
  );

  return relayed.map((account): RelayedAssignment => {
    const owners = ownersOf(catalog, account, known);
    if (owners.size === 0) {
      return { account, skipped: "unknownCharacters" };
    }
    if (owners.size > 1) {
      return { account, skipped: "severalMembers" };
    }
    const [userId] = owners;
    const member = members.get(userId);
    if (!member || member.status !== "active") {
      return { account, skipped: "inactiveMember" };
    }
    return {
      account,
      member: {
        actor: {
          userId,
          guildId: actor.guildId,
          role: member.role,
          status: member.status,
        },
        name: member.name ?? "?",
      },
    };
  });
}

/** Members owning a character of the account; one entered without server counts too. */
function ownersOf(
  catalog: GameCatalog,
  account: ExportedAccount,
  known: ReadonlyArray<{
    userId: string;
    name: string;
    serverKey: string | null;
  }>,
): Set<string> {
  const owners = new Set<string>();
  for (const character of account.characters) {
    const { serverKey } = resolveServerKey(catalog, character.realm);
    const name = character.name.toLowerCase();
    for (const row of known) {
      if (
        row.name.toLowerCase() === name &&
        (row.serverKey === serverKey || row.serverKey === null)
      ) {
        owners.add(row.userId);
      }
    }
  }
  return owners;
}
