import { and, asc, eq } from "drizzle-orm";
import { assertAllowed, permissions, type Actor } from "@/lib/auth/guards";
import type { AppDatabase } from "@/lib/db/client";
import { gameCatalogEntries, taskDefinitions } from "@/lib/db/schema";
import { NotFoundError } from "@/lib/errors";
import type { TaskKind, TaskScope } from "@/lib/reset/task-kinds";
import { isGameEnabled, loadGameCatalog } from "@/lib/roster/game-catalog";
import {
  resolveCustomTaskInput,
  type CustomTaskErrors,
  type CustomTaskInput,
} from "./custom-task-input";

export type { CustomTaskInput } from "./custom-task-input";

export type TaskRow = typeof taskDefinitions.$inferSelect;

export type CustomTaskResult =
  { ok: true; taskId: number } | { ok: false; errors: CustomTaskErrors };

export function listOwnTasks(db: AppDatabase, userId: string): TaskRow[] {
  return db
    .select()
    .from(taskDefinitions)
    .where(
      and(
        eq(taskDefinitions.source, "private"),
        eq(taskDefinitions.ownerId, userId),
      ),
    )
    .orderBy(asc(taskDefinitions.gameId), asc(taskDefinitions.id))
    .all();
}

/** A private task of the actor, for editing. */
export function getOwnTask(
  db: AppDatabase,
  actor: Actor,
  taskId: number,
): TaskRow {
  const task = db
    .select()
    .from(taskDefinitions)
    .where(eq(taskDefinitions.id, taskId))
    .get();
  if (!task || task.source !== "private" || task.ownerId !== actor.userId) {
    throw new NotFoundError("Aufgabe");
  }
  assertAllowed(permissions.editOwnData(actor, task.ownerId));
  return task;
}

/**
 * Creates a private task (SPEC 4.3, 7 item 8), or updates it when `taskId` is given.
 * Game, kind and scope are fixed after creation: changing them would reinterpret the
 * progress already stored, the same reason packs need a new ID for that (SPEC 6.5 B).
 */
export function saveCustomTask(
  db: AppDatabase,
  actor: Actor,
  input: CustomTaskInput,
  taskId?: number,
): CustomTaskResult {
  assertAllowed(permissions.editOwnData(actor, actor.userId));
  const existing =
    taskId === undefined ? undefined : getOwnTask(db, actor, taskId);
  const fixed = existing
    ? {
        ...input,
        gameId: existing.gameId ?? "",
        kind: existing.kind,
        scope: existing.scope,
      }
    : input;

  const catalog = fixed.gameId ? loadGameCatalog(db, fixed.gameId) : undefined;
  if (
    fixed.gameId &&
    (!catalog || (!existing && !isGameEnabled(db, actor.guildId, fixed.gameId)))
  ) {
    throw new NotFoundError("Spiel");
  }

  const resolved = resolveCustomTaskInput(fixed, catalog);
  if (!resolved.ok) {
    return resolved;
  }
  if (existing) {
    db.update(taskDefinitions)
      .set(resolved.values)
      .where(eq(taskDefinitions.id, existing.id))
      .run();
    return { ok: true, taskId: existing.id };
  }
  const created = db
    .insert(taskDefinitions)
    .values({
      ...resolved.values,
      source: "private",
      ownerId: actor.userId,
      gameId: fixed.gameId || null,
      kind: fixed.kind as TaskKind,
      scope: fixed.scope as TaskScope,
    })
    .returning()
    .get();
  return { ok: true, taskId: created.id };
}

/** Key of the pack rule a task uses, to preselect it in the form. */
export function packRuleKeyOf(
  db: AppDatabase,
  task: TaskRow,
): string | undefined {
  if (task.resetRuleEntryId === null) {
    return undefined;
  }
  return db
    .select({ key: gameCatalogEntries.key })
    .from(gameCatalogEntries)
    .where(eq(gameCatalogEntries.id, task.resetRuleEntryId))
    .get()?.key;
}

export function deleteCustomTask(
  db: AppDatabase,
  actor: Actor,
  taskId: number,
): void {
  const task = getOwnTask(db, actor, taskId);
  // Progress and snapshots go with it (foreign keys cascade).
  db.delete(taskDefinitions).where(eq(taskDefinitions.id, task.id)).run();
}
