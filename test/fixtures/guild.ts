import type { Actor } from "@/lib/auth/guards";
import type { AppDatabase } from "@/lib/db/client";
import { guildGames, type MemberRole } from "@/lib/db/schema";
import { addMember, createDiscordUser, createTestDb } from "@/lib/db/test-db";
import { ensureGuild } from "@/lib/guild/guild";
import { syncPack } from "@/lib/packs/sync";
import { validatePack } from "@/lib/packs/validate";

export interface MemberSpec {
  discordId: string;
  /** Display name; defaults to "User <last four digits>". */
  name?: string;
  role?: MemberRole;
}

/**
 * A migrated test DB with one guild, the given pack synced and enabled, and active
 * members as actors, in the order given.
 */
export function createGuildFixture(
  pack: { id: string } & Record<string, unknown>,
  members: MemberSpec[],
): { db: AppDatabase; actors: Actor[] } {
  const db = createTestDb();
  const guild = ensureGuild(db, {
    guildName: "Testgilde",
    defaultTimezone: "Europe/Berlin",
  });
  syncPack(db, {
    folderName: pack.id,
    file: `packs/${pack.id}/pack.json`,
    content: JSON.stringify(pack),
    ...validatePack(pack, pack.id),
  });
  db.update(guildGames).set({ enabled: true }).run();

  const actors = members.map(({ discordId, name, role = "member" }): Actor => {
    const userId = createDiscordUser(db, discordId, name);
    addMember(db, guild.id, userId, role);
    return { userId, guildId: guild.id, role, status: "active" };
  });
  return { db, actors };
}
