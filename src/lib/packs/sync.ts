import crypto from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import type {
  AppDatabase,
  DbTransaction as Transaction,
} from "@/lib/db/client";
import {
  gameCatalogEntries,
  games,
  guildGames,
  guilds,
  syncLogs,
  type CatalogStatus,
  type GameMeta,
  type SyncSummary,
} from "@/lib/db/schema";
import { CATALOG_KINDS, catalogEntriesOf, type CatalogKind } from "./catalog";
import {
  CATALOG_REFERENCES,
  type CatalogReference,
} from "./catalog-references";
import { formatIssue, type LoadedPack } from "./loader";
import type { Pack } from "./schema";
import { syncTasks } from "./task-sync";

type CatalogRow = typeof gameCatalogEntries.$inferSelect;

export type SyncStatus = "success" | "skipped" | "error";

export interface PackSyncResult {
  gameId: string;
  status: SyncStatus;
  summary?: SyncSummary;
  error?: string;
}

/**
 * Raised whenever the sync starts storing more of a pack (Phase 2: tasks), so that packs
 * whose file did not change are still synced once more after the upgrade.
 */
const SYNC_FORMAT = 2;

export function hashPackContent(content: string): string {
  return crypto
    .createHash("sha256")
    .update(`${SYNC_FORMAT}\n${content}`)
    .digest("hex");
}

/**
 * Brings one pack into the DB (SPEC 6.5). An invalid pack or a failure mid-sync never
 * touches existing data: the previous state stays active and only the error is recorded.
 */
export function syncPack(
  db: AppDatabase,
  loaded: LoadedPack,
  now: Date = new Date(),
): PackSyncResult {
  const gameId = loaded.pack?.id ?? loaded.folderName;
  const existing = db.select().from(games).where(eq(games.id, gameId)).get();

  if (!loaded.pack || loaded.content === undefined) {
    const error = loaded.errors
      .map((issue) => formatIssue(loaded.file, issue))
      .join("\n");
    return recordFailure(db, gameId, existing?.packVersion, error, now);
  }

  const pack = loaded.pack;
  const hash = hashPackContent(loaded.content);
  if (existing?.packHash === hash && existing.lastSyncError === null) {
    db.insert(syncLogs)
      .values({
        gameId,
        startedAt: now,
        finishedAt: new Date(),
        status: "skipped",
        fromVersion: existing.packVersion,
        toVersion: pack.version,
      })
      .run();
    return { gameId, status: "skipped" };
  }

  try {
    const summary = db.transaction((tx) => {
      upsertGame(tx, pack, hash, now);
      ensureGuildGames(tx, pack);
      const result = emptySummary();
      for (const kind of CATALOG_KINDS) {
        syncCatalog(tx, pack, kind, result);
      }
      syncTasks(tx, pack, result);
      tx.insert(syncLogs)
        .values({
          gameId,
          startedAt: now,
          finishedAt: new Date(),
          status: "success",
          fromVersion: existing?.packVersion ?? null,
          toVersion: pack.version,
          summary: result,
        })
        .run();
      return result;
    });
    return { gameId, status: "success", summary };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return recordFailure(db, gameId, existing?.packVersion, message, now);
  }
}

function recordFailure(
  db: AppDatabase,
  gameId: string,
  previousVersion: string | undefined,
  error: string,
  now: Date,
): PackSyncResult {
  db.insert(syncLogs)
    .values({
      gameId,
      startedAt: now,
      finishedAt: new Date(),
      status: "error",
      fromVersion: previousVersion ?? null,
      error,
    })
    .run();
  if (previousVersion !== undefined) {
    db.update(games)
      .set({ lastSyncError: error })
      .where(eq(games.id, gameId))
      .run();
  }
  return { gameId, status: "error", error };
}

function emptySummary(): SyncSummary {
  return {
    added: 0,
    changed: 0,
    deprecated: 0,
    removed: 0,
    migrations: [],
    affected_characters: [],
  };
}

function gameMetaOf(pack: Pack): GameMeta {
  return {
    type: pack.type,
    capabilities: pack.capabilities,
    characterLabel: pack.character_label,
    serverLabel: pack.server_label,
    regions: pack.regions,
    buildSources: pack.build_sources,
  };
}

function upsertGame(tx: Transaction, pack: Pack, hash: string, now: Date) {
  const values = {
    name: pack.name,
    meta: gameMetaOf(pack),
    packVersion: pack.version,
    packHash: hash,
    lastSyncAt: now,
    lastSyncError: null,
  };
  tx.insert(games)
    .values({ id: pack.id, ...values })
    .onConflictDoUpdate({ target: games.id, set: values })
    .run();
}

/** New games start disabled in every guild until an officer enables them (SPEC 6.1). */
function ensureGuildGames(tx: Transaction, pack: Pack) {
  const defaultRegion = pack.regions[0]?.id ?? null;
  for (const guild of tx.select({ id: guilds.id }).from(guilds).all()) {
    tx.insert(guildGames)
      .values({
        guildId: guild.id,
        gameId: pack.id,
        enabled: false,
        regionId: defaultRegion,
      })
      .onConflictDoNothing()
      .run();
  }
}

function syncCatalog(
  tx: Transaction,
  pack: Pack,
  kind: CatalogKind,
  summary: SyncSummary,
) {
  const packEntries = catalogEntriesOf(pack, kind);
  const rows = new Map(
    tx
      .select()
      .from(gameCatalogEntries)
      .where(
        and(
          eq(gameCatalogEntries.gameId, pack.id),
          eq(gameCatalogEntries.kind, kind),
        ),
      )
      .all()
      .map((row) => [row.key, row]),
  );

  const current = new Map<string, CatalogRow>();
  for (const entry of packEntries) {
    const values = {
      name: entry.name as CatalogRow["name"],
      data: entry.data,
      status: (entry.deprecated ? "deprecated" : "active") as CatalogStatus,
      todo: entry.todo,
      lastSeenPackVersion: pack.version,
    };
    const row = rows.get(entry.key);
    if (!row) {
      summary.added++;
      current.set(
        entry.key,
        tx
          .insert(gameCatalogEntries)
          .values({ gameId: pack.id, kind, key: entry.key, ...values })
          .returning()
          .get(),
      );
      continue;
    }

    if (values.status === "deprecated" && row.status !== "deprecated") {
      summary.deprecated++;
    } else if (
      JSON.stringify([row.name, row.data, row.status, row.todo]) !==
      JSON.stringify([values.name, values.data, values.status, values.todo])
    ) {
      summary.changed++;
    }
    current.set(
      entry.key,
      tx
        .update(gameCatalogEntries)
        .set(values)
        .where(eq(gameCatalogEntries.id, row.id))
        .returning()
        .get(),
    );
  }

  const replaced = new Set<string>();
  for (const entry of packEntries) {
    for (const oldKey of entry.replaces) {
      const oldRow = rows.get(oldKey);
      if (!oldRow) {
        continue;
      }
      replaced.add(oldKey);
      const newRow = current.get(entry.key)!;
      const counts = rewriteReferences(tx, pack.id, kind, oldRow, newRow);
      if (oldRow.status !== "removed" || counts.rewritten + counts.merged > 0) {
        summary.migrations.push({
          kind,
          from: oldKey,
          to: entry.key,
          rows_rewritten: counts.rewritten,
          rows_merged: counts.merged,
        });
      }
      markRemoved(tx, oldRow);
    }
  }

  for (const row of rows.values()) {
    if (
      current.has(row.key) ||
      replaced.has(row.key) ||
      row.status === "removed"
    ) {
      continue;
    }
    summary.removed++;
    markRemoved(tx, row);
    summary.affected_characters.push(
      ...charactersReferencing(tx, pack.id, kind, row),
    );
  }
}

function markRemoved(tx: Transaction, row: CatalogRow) {
  tx.update(gameCatalogEntries)
    .set({ status: "removed" })
    .where(eq(gameCatalogEntries.id, row.id))
    .run();
}

/** Moves every reference from oldRow to newRow, merging where a unique key would clash. */
function rewriteReferences(
  tx: Transaction,
  gameId: string,
  kind: CatalogKind,
  oldRow: CatalogRow,
  newRow: CatalogRow,
): { rewritten: number; merged: number } {
  let rewritten = 0;
  let merged = 0;
  for (const reference of CATALOG_REFERENCES[kind]) {
    const oldValue = storedValue(reference, oldRow);
    const newValue = storedValue(reference, newRow);

    if (reference.uniqueWith) {
      const holdersOfNew = tx
        .select({ owner: reference.uniqueWith })
        .from(reference.table)
        .where(eq(reference.column, newValue))
        .all()
        .map((row) => row.owner);
      if (holdersOfNew.length > 0) {
        merged += tx
          .delete(reference.table)
          .where(
            and(
              referencesValue(reference, gameId, oldValue),
              inArray(reference.uniqueWith, holdersOfNew),
            ),
          )
          .run().changes;
      }
    }

    // SET needs the bare column name; WHERE may use the table-qualified column.
    rewritten += tx.run(
      sql`UPDATE ${reference.table} SET ${sql.identifier(reference.column.name)} = ${newValue} WHERE ${referencesValue(reference, gameId, oldValue)}`,
    ).changes;
  }
  return { rewritten, merged };
}

function storedValue(reference: CatalogReference, row: CatalogRow) {
  return reference.storedAs === "key" ? row.key : row.id;
}

function referencesValue(
  reference: CatalogReference,
  gameId: string,
  value: string | number,
) {
  return reference.gameColumn
    ? and(eq(reference.column, value), eq(reference.gameColumn, gameId))
    : eq(reference.column, value);
}

function charactersReferencing(
  tx: Transaction,
  gameId: string,
  kind: CatalogKind,
  row: CatalogRow,
): SyncSummary["affected_characters"] {
  const ids = new Set<number>();
  for (const reference of CATALOG_REFERENCES[kind]) {
    if (!reference.characterColumn) {
      continue;
    }
    tx.select({ id: reference.characterColumn })
      .from(reference.table)
      .where(referencesValue(reference, gameId, storedValue(reference, row)))
      .all()
      .forEach((match) => ids.add(match.id as number));
  }
  return [...ids].map((id) => ({
    character_id: id,
    field: kind,
    old_id: row.key,
  }));
}

export function syncPacks(
  db: AppDatabase,
  packs: LoadedPack[],
  now: Date = new Date(),
): PackSyncResult[] {
  return packs.map((loaded) => syncPack(db, loaded, now));
}
