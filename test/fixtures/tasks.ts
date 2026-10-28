import { eq } from "drizzle-orm";
import type { Actor } from "@/lib/auth/guards";
import type { AppDatabase } from "@/lib/db/client";
import { characters, guildGames, taskDefinitions } from "@/lib/db/schema";
import { addMember, createDiscordUser, createTestDb } from "@/lib/db/test-db";
import { ensureGuild } from "@/lib/guild/guild";
import { syncPack } from "@/lib/packs/sync";
import { validatePack } from "@/lib/packs/validate";

/** A small pack covering every task kind, for task and dashboard tests. */
const raw = {
  id: "game",
  name: "Spiel",
  version: "1.0.0",
  server_label: "Realm",
  capabilities: { resets: true, lockouts: true, servers: true },
  regions: [{ id: "eu", timezone: "Europe/Berlin" }],
  bosses: [
    { id: "a", name: "Boss A" },
    { id: "b", name: "Boss B" },
  ],
  reset_rules: [{ id: "daily", type: "daily", time: "05:00" }],
  tasks: [
    {
      id: "quest",
      kind: "recurring",
      title: "Quest",
      scope: "character",
      reset_rule_id: "daily",
    },
    {
      id: "duty",
      kind: "counter",
      title: "Duty",
      scope: "server",
      reset_rule_id: "daily",
      cap: 3,
    },
    {
      id: "raid",
      kind: "lockout",
      title: "Raid",
      scope: "character",
      reset_rule_id: "daily",
      bosses: ["a", "b"],
    },
    {
      id: "energy",
      kind: "regen",
      title: "Energie",
      scope: "character",
      cap: 100,
      regen_amount: 10,
      regen_interval_minutes: 60,
    },
    {
      id: "tickets",
      kind: "stacking",
      title: "Tickets",
      scope: "account",
      reset_rule_id: "daily",
      cap: 6,
      per_period_gain: 2,
    },
  ],
};

export interface TaskFixture {
  db: AppDatabase;
  actor: Actor;
  other: Actor;
  officer: Actor;
  gameInfo: { id: string; name: string; serverLabel: string };
  taskId: (key: string) => number;
  createCharacter: (userId: string, name: string, server?: string) => number;
}

export function createTaskFixture(): TaskFixture {
  const db = createTestDb();
  const guild = ensureGuild(db, {
    guildName: "Testgilde",
    defaultTimezone: "Europe/Berlin",
  });
  const content = JSON.stringify(raw);
  syncPack(db, {
    folderName: "game",
    file: "packs/game/pack.json",
    content,
    ...validatePack(raw, "game"),
  });
  db.update(guildGames).set({ enabled: true }).run();

  const userId = createDiscordUser(db, "111111111111111111", "Erik");
  const otherId = createDiscordUser(db, "222222222222222222", "Lena");
  const officerId = createDiscordUser(db, "333333333333333333", "Mara");
  addMember(db, guild.id, userId);
  addMember(db, guild.id, otherId);
  addMember(db, guild.id, officerId, "officer");
  const actorOf = (id: string, role: Actor["role"] = "member"): Actor => ({
    userId: id,
    guildId: guild.id,
    role,
    status: "active",
  });

  return {
    db,
    actor: actorOf(userId),
    other: actorOf(otherId),
    officer: actorOf(officerId, "officer"),
    gameInfo: { id: "game", name: "Spiel", serverLabel: "Realm" },
    taskId: (key) =>
      db
        .select()
        .from(taskDefinitions)
        .where(eq(taskDefinitions.key, key))
        .get()!.id,
    createCharacter: (ownerId, name, server) =>
      db
        .insert(characters)
        .values({
          userId: ownerId,
          gameId: "game",
          name,
          serverKey: server?.toLowerCase() ?? null,
          serverName: server ?? null,
        })
        .returning()
        .get().id,
  };
}
