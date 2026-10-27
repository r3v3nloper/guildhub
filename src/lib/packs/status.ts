import { desc, inArray, sql } from "drizzle-orm";
import type { AppDatabase } from "@/lib/db/client";
import { syncLogs } from "@/lib/db/schema";

export type SyncLogEntry = typeof syncLogs.$inferSelect;

/** Latest sync attempt per pack; an `error` here means the pack is currently skipped. */
export function latestSyncPerGame(db: AppDatabase): SyncLogEntry[] {
  const latestIds = db
    .select({ id: sql<number>`max(${syncLogs.id})` })
    .from(syncLogs)
    .groupBy(syncLogs.gameId);
  return db
    .select()
    .from(syncLogs)
    .where(inArray(syncLogs.id, latestIds))
    .orderBy(syncLogs.gameId)
    .all();
}

export function failingPacks(db: AppDatabase): SyncLogEntry[] {
  return latestSyncPerGame(db).filter((entry) => entry.status === "error");
}

export function listSyncLog(db: AppDatabase, limit = 50): SyncLogEntry[] {
  return db
    .select()
    .from(syncLogs)
    .orderBy(desc(syncLogs.id))
    .limit(limit)
    .all();
}
