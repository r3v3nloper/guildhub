import { eq } from "drizzle-orm";
import type { AppDatabase } from "@/lib/db/client";
import { games, guildGames, guilds } from "@/lib/db/schema";
import type { ServerEnv } from "@/lib/env";

export type Guild = typeof guilds.$inferSelect;

const FALLBACK_GUILD_NAME = "Gilde";

/** The app serves exactly one guild; it is created on first start (SPEC 4.1). */
export function ensureGuild(
  db: AppDatabase,
  env: Pick<ServerEnv, "guildName" | "defaultTimezone">,
): Guild {
  const existing = db.select().from(guilds).limit(1).get();
  if (existing) {
    return existing;
  }

  const guild = db
    .insert(guilds)
    .values({
      name: env.guildName ?? FALLBACK_GUILD_NAME,
      defaultTimezone: env.defaultTimezone,
    })
    .returning()
    .get();

  for (const game of db.select().from(games).all()) {
    db.insert(guildGames)
      .values({
        guildId: guild.id,
        gameId: game.id,
        regionId: game.meta.regions[0]?.id ?? null,
      })
      .onConflictDoNothing()
      .run();
  }
  return guild;
}

export function getGuild(db: AppDatabase): Guild {
  const guild = db.select().from(guilds).limit(1).get();
  if (!guild) {
    throw new Error("Keine Gilde vorhanden; der Serverstart legt sie an.");
  }
  return guild;
}

export function renameGuild(db: AppDatabase, guildId: number, name: string) {
  db.update(guilds).set({ name }).where(eq(guilds.id, guildId)).run();
}
