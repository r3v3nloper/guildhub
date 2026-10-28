import { and, eq, inArray, like, or } from "drizzle-orm";
import { DateTime } from "luxon";
import { assertAllowed, permissions, type Actor } from "@/lib/auth/guards";
import type { AppDatabase, DbExecutor } from "@/lib/db/client";
import {
  characters,
  resourceStates,
  taskProgress,
  type ProgressData,
} from "@/lib/db/schema";
import { DomainError, NotFoundError } from "@/lib/errors";
import { projectStacking } from "@/lib/reset/resources";
import { scopeKey } from "@/lib/reset/scope-key";
import { loadVisibleTask, type ResolvedTask } from "./task-context";
import { taskPeriod } from "./task-period";

type ProgressRow = typeof taskProgress.$inferSelect;

/** Which progress entry a tap refers to: the character for character/server tasks. */
export interface ProgressTarget {
  taskId: number;
  characterId: number | null;
}

interface ProgressContext {
  task: ResolvedTask;
  scopeKey: string;
  periodKey: string;
}

/**
 * Resolves task and scope on the server. The scope key is never taken from the client,
 * so nobody can write progress that belongs to someone else (SPEC 8).
 */
function contextOf(
  db: AppDatabase,
  actor: Actor,
  target: ProgressTarget,
  now: DateTime,
): ProgressContext {
  assertAllowed(permissions.editOwnData(actor, actor.userId));
  const task = loadVisibleTask(db, actor.guildId, actor.userId, target.taskId);
  if (!task) {
    throw new NotFoundError("Aufgabe");
  }
  const period = taskPeriod(task, now);
  if (!period) {
    throw new DomainError("Diese Aufgabe ist noch nicht fällig.");
  }
  return {
    task,
    scopeKey: scopeKeyFor(db, actor, task, target.characterId),
    periodKey: period.key,
  };
}

function scopeKeyFor(
  db: AppDatabase,
  actor: Actor,
  task: ResolvedTask,
  characterId: number | null,
): string {
  if (task.scope === "user" || task.scope === "account") {
    return scopeKey(task.scope, { userId: actor.userId, gameId: task.gameId });
  }
  const character =
    characterId === null
      ? undefined
      : db
          .select()
          .from(characters)
          .where(eq(characters.id, characterId))
          .get();
  if (!character || character.gameId !== task.gameId) {
    throw new NotFoundError("Charakter");
  }
  assertAllowed(permissions.editOwnData(actor, character.userId));
  return scopeKey(task.scope, {
    userId: character.userId,
    gameId: character.gameId,
    characterId: character.id,
    server: character.serverKey,
  });
}

function writeProgress(
  db: AppDatabase,
  actor: Actor,
  context: ProgressContext,
  change: (current: ProgressRow | undefined) => {
    value?: number;
    data?: ProgressData | null;
    completedAt?: Date | null;
  },
  now: DateTime,
) {
  db.transaction((tx) => {
    const where = and(
      eq(taskProgress.taskId, context.task.id),
      eq(taskProgress.scopeKey, context.scopeKey),
      eq(taskProgress.periodKey, context.periodKey),
    );
    const current = tx.select().from(taskProgress).where(where).get();
    const values = {
      ...change(current),
      updatedAt: now.toJSDate(),
      updatedBy: actor.userId,
    };
    if (current) {
      tx.update(taskProgress).set(values).where(where).run();
      return;
    }
    tx.insert(taskProgress)
      .values({
        taskId: context.task.id,
        scopeKey: context.scopeKey,
        periodKey: context.periodKey,
        ...values,
      })
      .run();
  });
}

function requireKind(task: ResolvedTask, kinds: ResolvedTask["kind"][]) {
  if (!kinds.includes(task.kind)) {
    throw new DomainError("Diese Aktion passt nicht zur Aufgabe.");
  }
}

/** recurring / one_time / lockout: tick or untick for the current period. */
export function setTaskDone(
  db: AppDatabase,
  actor: Actor,
  target: ProgressTarget,
  done: boolean,
  now: DateTime = DateTime.now(),
): void {
  const context = contextOf(db, actor, target, now);
  requireKind(context.task, ["recurring", "one_time", "lockout"]);
  writeProgress(
    db,
    actor,
    context,
    (current) => ({
      completedAt: done ? (current?.completedAt ?? now.toJSDate()) : null,
    }),
    now,
  );
}

/** counter: +1 / −1, kept between 0 and the cap. */
export function adjustCounter(
  db: AppDatabase,
  actor: Actor,
  target: ProgressTarget,
  delta: number,
  now: DateTime = DateTime.now(),
): void {
  const context = contextOf(db, actor, target, now);
  requireKind(context.task, ["counter"]);
  const cap = context.task.cap ?? Number.POSITIVE_INFINITY;
  writeProgress(
    db,
    actor,
    context,
    (current) => ({
      value: Math.max(0, Math.min(cap, (current?.value ?? 0) + delta)),
    }),
    now,
  );
}

/** lockout: mark one boss of the raid ID as killed or alive again. */
export function setBossKilled(
  db: AppDatabase,
  actor: Actor,
  target: ProgressTarget,
  bossKey: string,
  killed: boolean,
  now: DateTime = DateTime.now(),
): void {
  const context = contextOf(db, actor, target, now);
  requireKind(context.task, ["lockout"]);
  if (!(context.task.bosses ?? []).includes(bossKey)) {
    throw new NotFoundError("Boss");
  }
  writeProgress(
    db,
    actor,
    context,
    (current) => {
      const others = (current?.data?.killed ?? []).filter(
        (key) => key !== bossKey,
      );
      return {
        data: {
          ...current?.data,
          killed: killed ? [...others, bossKey] : others,
        },
      };
    },
    now,
  );
}

function writeSnapshot(
  db: AppDatabase,
  actor: Actor,
  context: ProgressContext,
  value: number,
  now: DateTime,
) {
  const cap = context.task.cap ?? Number.POSITIVE_INFINITY;
  if (!Number.isInteger(value) || value < 0 || value > cap) {
    throw new DomainError(`Bitte einen Wert zwischen 0 und ${cap} eingeben.`);
  }
  const values = {
    value,
    valueAt: now.toJSDate(),
    updatedBy: actor.userId,
  };
  db.insert(resourceStates)
    .values({ taskId: context.task.id, scopeKey: context.scopeKey, ...values })
    .onConflictDoUpdate({
      target: [resourceStates.taskId, resourceStates.scopeKey],
      set: values,
    })
    .run();
}

/** regen / stacking: the value the player sees in the game right now (SPEC 5.3). */
export function setResourceValue(
  db: AppDatabase,
  actor: Actor,
  target: ProgressTarget,
  value: number,
  now: DateTime = DateTime.now(),
): void {
  const context = contextOf(db, actor, target, now);
  requireKind(context.task, ["regen", "stacking"]);
  writeSnapshot(db, actor, context, value, now);
}

/** stacking: one entry used – projected value minus one, as a new snapshot. */
export function consumeStacking(
  db: AppDatabase,
  actor: Actor,
  target: ProgressTarget,
  now: DateTime = DateTime.now(),
): void {
  const context = contextOf(db, actor, target, now);
  const { task } = context;
  requireKind(task, ["stacking"]);
  const snapshot = db
    .select()
    .from(resourceStates)
    .where(
      and(
        eq(resourceStates.taskId, task.id),
        eq(resourceStates.scopeKey, context.scopeKey),
      ),
    )
    .get();
  if (!snapshot || !task.rule) {
    throw new DomainError("Bitte zuerst den aktuellen Stand eintragen.");
  }
  const projected = projectStacking(
    { cap: task.cap!, perPeriodGain: task.perPeriodGain! },
    task.rule,
    task.ruleZone,
    { value: snapshot.value, valueAt: DateTime.fromJSDate(snapshot.valueAt) },
    now,
  );
  if (projected === 0) {
    throw new DomainError("Keine Einträge mehr übrig.");
  }
  writeSnapshot(db, actor, context, projected - 1, now);
}

/** Progress stored under a character's own scope key; called when it is deleted. */
export function deleteCharacterProgress(
  db: DbExecutor,
  characterIds: readonly number[],
): void {
  if (characterIds.length === 0) {
    return;
  }
  const keys = characterIds.map((id) => `c:${id}`);
  db.delete(taskProgress).where(inArray(taskProgress.scopeKey, keys)).run();
  db.delete(resourceStates).where(inArray(resourceStates.scopeKey, keys)).run();
}

/** Server, account and user progress of a user; called when the member is purged. */
export function deleteUserProgress(db: DbExecutor, userId: string): void {
  const ownedBy = (
    column: typeof taskProgress.scopeKey | typeof resourceStates.scopeKey,
  ) =>
    or(
      like(column, `s:${userId}:%`),
      like(column, `a:${userId}:%`),
      eq(column, `u:${userId}`),
    );
  db.delete(taskProgress).where(ownedBy(taskProgress.scopeKey)).run();
  db.delete(resourceStates).where(ownedBy(resourceStates.scopeKey)).run();
}
