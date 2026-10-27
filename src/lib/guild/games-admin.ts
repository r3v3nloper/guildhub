import { and, eq } from "drizzle-orm";
import { recordAudit } from "@/lib/audit/audit";
import { assertAllowed, permissions, type Actor } from "@/lib/auth/guards";
import type { AppDatabase } from "@/lib/db/client";
import { gameCatalogEntries, games, guildGames } from "@/lib/db/schema";
import { DomainError, NotFoundError } from "@/lib/errors";
import { renameGuild } from "./guild";

export type CatalogEntry = typeof gameCatalogEntries.$inferSelect;

function guildGameOf(guildId: number, gameId: string) {
  return and(eq(guildGames.guildId, guildId), eq(guildGames.gameId, gameId));
}

export function setGameEnabled(
  db: AppDatabase,
  actor: Actor,
  gameId: string,
  enabled: boolean,
): void {
  assertAllowed(permissions.manageGames(actor));
  const result = db
    .update(guildGames)
    .set({ enabled })
    .where(guildGameOf(actor.guildId, gameId))
    .run();
  if (result.changes === 0) {
    throw new NotFoundError("Spiel");
  }
  recordAudit(
    db,
    actor.userId,
    enabled ? "game.enable" : "game.disable",
    gameId,
  );
}

export function setGameRegion(
  db: AppDatabase,
  actor: Actor,
  gameId: string,
  regionId: string,
): void {
  assertAllowed(permissions.manageGames(actor));
  const game = db.select().from(games).where(eq(games.id, gameId)).get();
  if (!game) {
    throw new NotFoundError("Spiel");
  }
  if (!game.meta.regions.some((region) => region.id === regionId)) {
    throw new DomainError("Diese Region gibt es im Pack nicht.");
  }
  db.update(guildGames)
    .set({ regionId })
    .where(guildGameOf(actor.guildId, gameId))
    .run();
  recordAudit(db, actor.userId, "game.region", gameId, { regionId });
}

const GUILD_NAME_MAX_LENGTH = 60;

export function renameGuildAsAdmin(
  db: AppDatabase,
  actor: Actor,
  name: string,
): void {
  assertAllowed(permissions.manageGuild(actor));
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > GUILD_NAME_MAX_LENGTH) {
    throw new DomainError(
      `Name mit 1 bis ${GUILD_NAME_MAX_LENGTH} Zeichen angeben.`,
    );
  }
  renameGuild(db, actor.guildId, trimmed);
  recordAudit(db, actor.userId, "guild.rename", String(actor.guildId), {
    name: trimmed,
  });
}

/** Pack entries still marked as assumptions (`todo`), per game (SPEC 6.2). */
export function listTodoEntries(db: AppDatabase): CatalogEntry[] {
  return db
    .select()
    .from(gameCatalogEntries)
    .where(eq(gameCatalogEntries.todo, true))
    .orderBy(
      gameCatalogEntries.gameId,
      gameCatalogEntries.kind,
      gameCatalogEntries.id,
    )
    .all()
    .filter((entry) => entry.status !== "removed");
}
