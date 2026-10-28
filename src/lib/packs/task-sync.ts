import { and, eq, inArray } from "drizzle-orm";
import type { DbTransaction as Transaction } from "@/lib/db/client";
import {
  gameCatalogEntries,
  resourceStates,
  taskDefinitions,
  taskProgress,
  type SyncSummary,
} from "@/lib/db/schema";
import type { Pack, PackTask } from "./schema";

type TaskRow = typeof taskDefinitions.$inferSelect;
type ProgressRow = typeof taskProgress.$inferSelect;
type ResourceRow = typeof resourceStates.$inferSelect;

/** Thrown inside the sync transaction, so the whole pack is skipped (SPEC 6.5 B). */
export class TaskKindChangedError extends Error {
  public constructor(task: TaskRow, newKind: string) {
    super(
      `Aufgabe '${task.key}': kind von '${task.kind}' zu '${newKind}' geändert. ` +
        "Eine semantische Änderung braucht eine neue Aufgaben-ID.",
    );
    this.name = "TaskKindChangedError";
  }
}

/**
 * Brings the pack's tasks into the DB. Runs after the catalogs, because tasks point at
 * reset-rule entries. Progress is never deleted: a vanished task only becomes inactive.
 */
export function syncTasks(tx: Transaction, pack: Pack, summary: SyncSummary) {
  const ruleIds = new Map(
    tx
      .select({ id: gameCatalogEntries.id, key: gameCatalogEntries.key })
      .from(gameCatalogEntries)
      .where(
        and(
          eq(gameCatalogEntries.gameId, pack.id),
          eq(gameCatalogEntries.kind, "reset_rule"),
        ),
      )
      .all()
      .map((rule) => [rule.key, rule.id]),
  );
  const rows = new Map(
    tx
      .select()
      .from(taskDefinitions)
      .where(
        and(
          eq(taskDefinitions.gameId, pack.id),
          eq(taskDefinitions.source, "pack"),
        ),
      )
      .all()
      .map((row) => [row.key!, row]),
  );

  const current = new Map<string, TaskRow>();
  for (const task of pack.tasks) {
    const values = taskValuesOf(task, ruleIds);
    const row = rows.get(task.id);
    if (!row) {
      summary.added++;
      current.set(
        task.id,
        tx
          .insert(taskDefinitions)
          .values({ gameId: pack.id, source: "pack", key: task.id, ...values })
          .returning()
          .get(),
      );
      continue;
    }
    if (row.kind !== task.kind) {
      throw new TaskKindChangedError(row, task.kind);
    }
    const updated = tx
      .update(taskDefinitions)
      .set(values)
      .where(eq(taskDefinitions.id, row.id))
      .returning()
      .get();
    if (comparable(row) !== comparable(updated)) {
      summary.changed++;
    }
    current.set(task.id, updated);
  }

  const replaced = new Set<string>();
  for (const task of pack.tasks) {
    for (const oldKey of task.replaces) {
      const oldRow = rows.get(oldKey);
      if (!oldRow) {
        continue;
      }
      replaced.add(oldKey);
      const counts = moveTaskData(tx, oldRow.id, current.get(task.id)!.id);
      if (oldRow.active || counts.rewritten + counts.merged > 0) {
        summary.migrations.push({
          kind: "task",
          from: oldKey,
          to: task.id,
          rows_rewritten: counts.rewritten,
          rows_merged: counts.merged,
        });
      }
      deactivate(tx, oldRow);
    }
  }

  for (const row of rows.values()) {
    if (current.has(row.key!) || replaced.has(row.key!) || !row.active) {
      continue;
    }
    summary.removed++;
    deactivate(tx, row);
  }
}

function taskValuesOf(task: PackTask, ruleIds: Map<string, number>) {
  return {
    title: task.title,
    description: task.description ?? null,
    kind: task.kind,
    category: task.category ?? null,
    scope: task.scope,
    resetRuleEntryId: task.reset_rule_id
      ? (ruleIds.get(task.reset_rule_id) ?? null)
      : null,
    customResetRule: null,
    cap: task.cap ?? null,
    regenAmount: task.regen_amount ?? null,
    regenIntervalMinutes: task.regen_interval_minutes ?? null,
    regenAlignment:
      task.kind === "regen" ? (task.regen_alignment ?? "fixed") : null,
    timezone: task.timezone ?? null,
    perPeriodGain: task.per_period_gain ?? null,
    alertAt: task.alert_at ?? null,
    bosses: task.bosses ?? null,
    priority: task.priority,
    sortOrder: task.order ?? null,
    tags: task.tags,
    link: task.link ?? null,
    active: true,
    todo: task.todo,
  };
}

/** The fields a pack controls, to tell a real change from a re-sync of the same content. */
function comparable(row: TaskRow): string {
  return JSON.stringify({ ...row, id: undefined, createdAt: undefined });
}

function deactivate(tx: Transaction, row: TaskRow) {
  tx.update(taskDefinitions)
    .set({ active: false })
    .where(eq(taskDefinitions.id, row.id))
    .run();
}

/**
 * Moves progress and resource snapshots of a replaced task to its successor. Where both
 * already hold an entry for the same scope (and period), they are merged (SPEC 6.5 B).
 */
function moveTaskData(
  tx: Transaction,
  fromTaskId: number,
  toTaskId: number,
): { rewritten: number; merged: number } {
  const progress = moveProgress(tx, fromTaskId, toTaskId);
  const resources = moveResources(tx, fromTaskId, toTaskId);
  return {
    rewritten: progress.rewritten + resources.rewritten,
    merged: progress.merged + resources.merged,
  };
}

function moveProgress(tx: Transaction, fromTaskId: number, toTaskId: number) {
  const target = new Map(
    tx
      .select()
      .from(taskProgress)
      .where(eq(taskProgress.taskId, toTaskId))
      .all()
      .map((row) => [`${row.scopeKey}|${row.periodKey}`, row]),
  );
  let rewritten = 0;
  let merged = 0;
  const source = tx
    .select()
    .from(taskProgress)
    .where(eq(taskProgress.taskId, fromTaskId))
    .all();
  for (const row of source) {
    const clash = target.get(`${row.scopeKey}|${row.periodKey}`);
    if (!clash) {
      rewritten++;
      continue;
    }
    merged++;
    tx.update(taskProgress)
      .set(mergedProgress(clash, row))
      .where(eq(taskProgress.id, clash.id))
      .run();
    tx.delete(taskProgress).where(eq(taskProgress.id, row.id)).run();
  }
  tx.update(taskProgress)
    .set({ taskId: toTaskId })
    .where(eq(taskProgress.taskId, fromTaskId))
    .run();
  return { rewritten, merged };
}

/** Earliest completion, highest value, union of killed bosses. */
function mergedProgress(a: ProgressRow, b: ProgressRow) {
  const completed = [a.completedAt, b.completedAt].filter(
    (date): date is Date => date !== null,
  );
  const killed = [
    ...new Set([...(a.data?.killed ?? []), ...(b.data?.killed ?? [])]),
  ];
  const note = a.data?.note ?? b.data?.note;
  return {
    completedAt:
      completed.length > 0
        ? new Date(Math.min(...completed.map((date) => date.getTime())))
        : null,
    value: Math.max(a.value, b.value),
    data:
      killed.length > 0 || note !== undefined
        ? { ...(killed.length > 0 && { killed }), ...(note && { note }) }
        : null,
  };
}

function moveResources(tx: Transaction, fromTaskId: number, toTaskId: number) {
  const target = new Map(
    tx
      .select()
      .from(resourceStates)
      .where(eq(resourceStates.taskId, toTaskId))
      .all()
      .map((row) => [row.scopeKey, row]),
  );
  let rewritten = 0;
  let merged = 0;
  const obsolete: number[] = [];
  const source = tx
    .select()
    .from(resourceStates)
    .where(eq(resourceStates.taskId, fromTaskId))
    .all();
  for (const row of source) {
    const clash = target.get(row.scopeKey);
    if (!clash) {
      rewritten++;
      continue;
    }
    merged++;
    if (row.valueAt > clash.valueAt) {
      tx.update(resourceStates)
        .set(newerSnapshot(row))
        .where(eq(resourceStates.id, clash.id))
        .run();
    }
    obsolete.push(row.id);
  }
  if (obsolete.length > 0) {
    tx.delete(resourceStates).where(inArray(resourceStates.id, obsolete)).run();
  }
  tx.update(resourceStates)
    .set({ taskId: toTaskId })
    .where(eq(resourceStates.taskId, fromTaskId))
    .run();
  return { rewritten, merged };
}

function newerSnapshot(row: ResourceRow) {
  return { value: row.value, valueAt: row.valueAt, updatedBy: row.updatedBy };
}
