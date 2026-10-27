import { openDatabase, type AppDatabase } from "./client";
import { migrateDatabase } from "./migrate";
import { accounts, guildMembers, users, type MemberRole } from "./schema";

/** A migrated in-memory database for tests; the same migrations production runs. */
export function createTestDb(): AppDatabase {
  const db = openDatabase(":memory:");
  migrateDatabase(db);
  return db;
}

export function createDiscordUser(
  db: AppDatabase,
  discordId: string,
  name = `User ${discordId.slice(-4)}`,
): string {
  const user = db.insert(users).values({ name }).returning().get();
  db.insert(accounts)
    .values({
      userId: user.id,
      type: "oauth",
      provider: "discord",
      providerAccountId: discordId,
    })
    .run();
  return user.id;
}

export function addMember(
  db: AppDatabase,
  guildId: number,
  userId: string,
  role: MemberRole = "member",
): void {
  db.insert(guildMembers).values({ guildId, userId, role }).run();
}
