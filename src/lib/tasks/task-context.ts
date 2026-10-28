import { and, eq, inArray, isNull, or } from "drizzle-orm";
import type { AppDatabase } from "@/lib/db/client";
import {
  gameCatalogEntries,
  games,
  guildGames,
  guilds,
  taskDefinitions,
} from "@/lib/db/schema";
import { effectiveTimezone } from "@/lib/reset/periods";
import type { ResetRule } from "@/lib/reset/types";

export type TaskRow = typeof taskDefinitions.$inferSelect;

/** A task with the rule and zones the engine needs to evaluate it. */
export interface ResolvedTask extends TaskRow {
  rule: ResetRule | undefined;
  /** Zone of the reset rule (SPEC 4.4); the guild's zone for cross-game tasks. */
  ruleZone: string;
  /** Zone of fixed regen ticks: the task's own zone, else the region's. */
  regenZone: string;
}

/** Region zones of the guild's games, falling back to the guild's default zone. */
export function regionZones(
  db: AppDatabase,
  guildId: number,
): { byGame: Map<string, string>; guildZone: string } {
  const guild = db.select().from(guilds).where(eq(guilds.id, guildId)).get();
  const guildZone = guild?.defaultTimezone ?? "Europe/Berlin";
  const rows = db
    .select({
      gameId: games.id,
      meta: games.meta,
      regionId: guildGames.regionId,
    })
    .from(guildGames)
    .innerJoin(games, eq(games.id, guildGames.gameId))
    .where(eq(guildGames.guildId, guildId))
    .all();
  const byGame = new Map<string, string>();
  for (const row of rows) {
    const regions = row.meta.regions;
    const region =
      regions.find((candidate) => candidate.id === row.regionId) ?? regions[0];
    byGame.set(row.gameId, region?.timezone ?? guildZone);
  }
  return { byGame, guildZone };
}

/**
 * Active tasks the user sees: pack tasks of the given games (and guild tasks), plus the
 * user's own private tasks. Private tasks of other users never appear (SPEC 8).
 */
export function loadVisibleTasks(
  db: AppDatabase,
  guildId: number,
  userId: string,
  gameIds: readonly string[],
): ResolvedTask[] {
  const inGames =
    gameIds.length > 0
      ? inArray(taskDefinitions.gameId, [...gameIds])
      : undefined;
  const packFilter = inGames
    ? and(eq(taskDefinitions.source, "pack"), inGames)
    : undefined;
  // Guild tasks without a game concern everyone, whatever the game filter says.
  const guildFilter = and(
    eq(taskDefinitions.source, "guild"),
    inGames
      ? or(isNull(taskDefinitions.gameId), inGames)
      : isNull(taskDefinitions.gameId),
  );
  const ownFilter = and(
    eq(taskDefinitions.source, "private"),
    eq(taskDefinitions.ownerId, userId),
  );
  const rows = db
    .select()
    .from(taskDefinitions)
    .where(
      and(
        eq(taskDefinitions.active, true),
        or(...[packFilter, guildFilter, ownFilter].filter(Boolean)),
      ),
    )
    .all();
  return resolveTasks(db, guildId, rows);
}

export function resolveTasks(
  db: AppDatabase,
  guildId: number,
  rows: TaskRow[],
): ResolvedTask[] {
  const zones = regionZones(db, guildId);
  const ruleIds = rows
    .map((row) => row.resetRuleEntryId)
    .filter((id): id is number => id !== null);
  const packRules = new Map(
    (ruleIds.length > 0
      ? db
          .select()
          .from(gameCatalogEntries)
          .where(inArray(gameCatalogEntries.id, ruleIds))
          .all()
      : []
    ).map((entry) => [entry.id, entry.data as unknown as ResetRule]),
  );

  return rows.map((row) => {
    const rule =
      row.customResetRule ??
      (row.resetRuleEntryId !== null
        ? packRules.get(row.resetRuleEntryId)
        : undefined);
    const regionZone =
      (row.gameId && zones.byGame.get(row.gameId)) || zones.guildZone;
    return {
      ...row,
      rule,
      ruleZone: rule ? effectiveTimezone(rule, regionZone) : regionZone,
      regenZone: row.timezone ?? regionZone,
    };
  });
}

/** One task, if the user may see it. */
export function loadVisibleTask(
  db: AppDatabase,
  guildId: number,
  userId: string,
  taskId: number,
): ResolvedTask | undefined {
  const row = db
    .select()
    .from(taskDefinitions)
    .where(eq(taskDefinitions.id, taskId))
    .get();
  if (!row || !row.active) {
    return undefined;
  }
  if (row.source === "private" && row.ownerId !== userId) {
    return undefined;
  }
  return resolveTasks(db, guildId, [row])[0];
}
