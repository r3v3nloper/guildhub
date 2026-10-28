import type { Actor } from "@/lib/auth/guards";
import type { AppDatabase } from "@/lib/db/client";
import { guildGames, type MemberRole } from "@/lib/db/schema";
import { addMember, createDiscordUser, createTestDb } from "@/lib/db/test-db";
import { ensureGuild } from "@/lib/guild/guild";
import { syncPack } from "@/lib/packs/sync";
import { validatePack } from "@/lib/packs/validate";

const raw = {
  id: "game",
  name: "Spiel",
  version: "1.0.0",
  capabilities: { professions: true },
  professions: [{ id: "mining", name: "Bergbau", kind: "gathering" }],
};

export interface ListFixture {
  db: AppDatabase;
  member: Actor;
  other: Actor;
  officer: Actor;
}

/** One enabled game with a profession, and three members of different rank. */
export function createListFixture(): ListFixture {
  const db = createTestDb();
  const guild = ensureGuild(db, {
    guildName: "Testgilde",
    defaultTimezone: "Europe/Berlin",
  });
  syncPack(db, {
    folderName: "game",
    file: "packs/game/pack.json",
    content: JSON.stringify(raw),
    ...validatePack(raw, "game"),
  });
  db.update(guildGames).set({ enabled: true }).run();

  const actorOf = (discordId: string, role: MemberRole): Actor => {
    const userId = createDiscordUser(db, discordId);
    addMember(db, guild.id, userId, role);
    return { userId, guildId: guild.id, role, status: "active" };
  };
  return {
    db,
    member: actorOf("111111111111111111", "member"),
    other: actorOf("222222222222222222", "member"),
    officer: actorOf("333333333333333333", "officer"),
  };
}
