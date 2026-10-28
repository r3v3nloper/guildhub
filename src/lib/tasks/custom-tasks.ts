import { and, asc, eq } from "drizzle-orm";
import { assertAllowed, permissions, type Actor } from "@/lib/auth/guards";
import type { AppDatabase } from "@/lib/db/client";
import { gameCatalogEntries, taskDefinitions } from "@/lib/db/schema";
import { DomainError, NotFoundError } from "@/lib/errors";
import {
  resetRuleIssues,
  taskConsistencyIssues,
  type TaskShape,
} from "@/lib/reset/task-consistency";
import {
  TASK_KINDS,
  TASK_SCOPES,
  type TaskKind,
  type TaskScope,
} from "@/lib/reset/task-kinds";
import { RESET_RULE_TYPES, type ResetRule } from "@/lib/reset/types";
import {
  catalogOfKind,
  isGameEnabled,
  loadGameCatalog,
  type GameCatalog,
} from "@/lib/roster/game-catalog";
import { isHttpUrl } from "@/lib/roster/build-source";
import { CUSTOM_RULE, NO_RULE } from "./rule-choices";

export type TaskRow = typeof taskDefinitions.$inferSelect;

export interface CustomTaskInput {
  title: string;
  /** Empty = cross-game task (scope user). */
  gameId: string;
  kind: string;
  scope: string;
  category: string;
  link: string;
  rule: string;
  ruleType: string;
  ruleTime: string;
  ruleWeekday: number | null;
  ruleDayOfMonth: number | null;
  ruleNDays: number | null;
  ruleAnchor: string;
  cap: number | null;
  alertAt: number | null;
  regenAmount: number | null;
  regenIntervalMinutes: number | null;
  regenAlignment: string;
  perPeriodGain: number | null;
}

export type CustomTaskErrors = Partial<Record<keyof CustomTaskInput, string>>;

export type CustomTaskResult =
  { ok: true; taskId: number } | { ok: false; errors: CustomTaskErrors };

/** Kinds that run in periods; the others either never reset or keep a snapshot. */
const KINDS_WITH_RULE: readonly TaskKind[] = [
  "recurring",
  "counter",
  "lockout",
  "stacking",
];

/** Form field for each field name the shared consistency check reports. */
const FIELD_OF_ISSUE: Record<string, keyof CustomTaskInput> = {
  reset_rule_id: "rule",
  cap: "cap",
  alert_at: "alertAt",
  regen_amount: "regenAmount",
  regen_interval_minutes: "regenIntervalMinutes",
  per_period_gain: "perPeriodGain",
  weekday: "ruleWeekday",
  day_of_month: "ruleDayOfMonth",
  n_days: "ruleNDays",
  anchor: "ruleAnchor",
};

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

  const resolved = resolveInput(fixed, catalog);
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

/** Scopes a custom task may use in a game (SPEC 4.1); cross-game tasks are scope user. */
export function allowedScopes(catalog: GameCatalog | undefined): TaskScope[] {
  if (!catalog) {
    return ["user"];
  }
  return TASK_SCOPES.filter(
    (scope) =>
      scope !== "user" &&
      (scope !== "server" || catalog.game.meta.capabilities.servers),
  );
}

type Resolved =
  | {
      ok: true;
      values: Omit<
        typeof taskDefinitions.$inferInsert,
        "source" | "kind" | "scope"
      >;
    }
  | { ok: false; errors: CustomTaskErrors };

function resolveInput(
  input: CustomTaskInput,
  catalog: GameCatalog | undefined,
): Resolved {
  const errors: CustomTaskErrors = {};
  const title = input.title.trim();
  if (!title) {
    errors.title = "Bitte einen Titel eingeben.";
  } else if (title.length > 80) {
    errors.title = "Höchstens 80 Zeichen.";
  }
  const link = input.link.trim();
  if (link && !isHttpUrl(link)) {
    errors.link = "Bitte einen http(s)-Link eingeben.";
  }
  if (!TASK_KINDS.includes(input.kind as TaskKind)) {
    throw new DomainError("Unbekannter Aufgabentyp.");
  }
  const kind = input.kind as TaskKind;
  if (!allowedScopes(catalog).includes(input.scope as TaskScope)) {
    errors.scope = "Dieser Geltungsbereich passt nicht zum Spiel.";
  }

  const numbers: Array<keyof CustomTaskInput> = [
    "cap",
    "alertAt",
    "regenAmount",
    "regenIntervalMinutes",
    "perPeriodGain",
    "ruleWeekday",
    "ruleDayOfMonth",
    "ruleNDays",
  ];
  for (const field of numbers) {
    const value = input[field] as number | null;
    if (value !== null && (!Number.isInteger(value) || value < 1)) {
      errors[field] = "Bitte eine ganze Zahl ab 1 eingeben.";
    }
  }

  const rule = resolveRule(input, kind, catalog, errors);
  const only = <T>(kinds: TaskKind[], value: T | null) =>
    kinds.includes(kind) && value !== null ? value : undefined;
  const shape: TaskShape = {
    kind,
    hasResetRule: rule.packRuleId !== null || rule.custom !== null,
    cap: only(["counter", "regen", "stacking"], input.cap),
    alert_at: only(["regen", "stacking"], input.alertAt),
    regen_amount: only(["regen"], input.regenAmount),
    regen_interval_minutes: only(["regen"], input.regenIntervalMinutes),
    per_period_gain: only(["stacking"], input.perPeriodGain),
  };
  for (const issue of taskConsistencyIssues(shape)) {
    const field = FIELD_OF_ISSUE[issue.field];
    if (field && !errors[field]) {
      errors[field] = issue.message.startsWith("Pflicht")
        ? "Pflichtfeld für diesen Typ."
        : "Darf nicht größer als das Maximum sein.";
    }
  }
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    values: {
      title,
      category: input.category.trim() || null,
      link: link || null,
      resetRuleEntryId: rule.packRuleId,
      customResetRule: rule.custom,
      cap: shape.cap ?? null,
      alertAt: shape.alert_at ?? null,
      regenAmount: shape.regen_amount ?? null,
      regenIntervalMinutes: shape.regen_interval_minutes ?? null,
      regenAlignment:
        kind === "regen"
          ? input.regenAlignment === "relative"
            ? "relative"
            : "fixed"
          : null,
      perPeriodGain: shape.per_period_gain ?? null,
      tags: [],
    },
  };
}

function resolveRule(
  input: CustomTaskInput,
  kind: TaskKind,
  catalog: GameCatalog | undefined,
  errors: CustomTaskErrors,
): { packRuleId: number | null; custom: ResetRule | null } {
  const none = { packRuleId: null, custom: null };
  // Regen keeps a snapshot and one_time never resets; neither uses a rule.
  if (!KINDS_WITH_RULE.includes(kind)) {
    return none;
  }
  if (input.rule === NO_RULE) {
    return none;
  }
  if (input.rule !== CUSTOM_RULE) {
    const entry = catalog
      ? catalogOfKind(catalog, "reset_rule").find(
          (candidate) =>
            candidate.key === input.rule && candidate.status !== "removed",
        )
      : undefined;
    if (!entry) {
      errors.rule = "Unbekannte Reset-Regel.";
      return none;
    }
    return { packRuleId: entry.id, custom: null };
  }

  if (!RESET_RULE_TYPES.includes(input.ruleType as ResetRule["type"])) {
    errors.ruleType = "Bitte einen Rhythmus wählen.";
    return none;
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.ruleTime)) {
    errors.ruleTime = "Uhrzeit als HH:MM.";
    return none;
  }
  const type = input.ruleType as ResetRule["type"];
  const custom: ResetRule = {
    type,
    time: input.ruleTime,
    timezone: null,
    weekday: type === "weekly" ? input.ruleWeekday : null,
    day_of_month: type === "monthly" ? input.ruleDayOfMonth : null,
    n_days: type === "every_n_days" ? input.ruleNDays : null,
    anchor: type === "every_n_days" ? input.ruleAnchor || null : null,
  };
  if (custom.weekday !== null && custom.weekday > 7) {
    errors.ruleWeekday = "Wochentag 1 (Mo) bis 7 (So).";
  }
  if (custom.day_of_month !== null && custom.day_of_month > 28) {
    errors.ruleDayOfMonth = "Tag 1 bis 28.";
  }
  if (custom.anchor !== null && !/^\d{4}-\d{2}-\d{2}$/.test(custom.anchor)) {
    errors.ruleAnchor = "Datum als JJJJ-MM-TT.";
  }
  for (const issue of resetRuleIssues(custom)) {
    const field = FIELD_OF_ISSUE[issue.field];
    if (field && !errors[field]) {
      errors[field] = "Pflichtfeld für diesen Rhythmus.";
    }
  }
  return { packRuleId: null, custom };
}
