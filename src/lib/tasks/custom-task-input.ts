import type { taskDefinitions } from "@/lib/db/schema";
import { DomainError } from "@/lib/errors";
import {
  resetRuleIssues,
  taskConsistencyIssues,
  type TaskShape,
} from "@/lib/reset/task-consistency";
import {
  CUSTOM_ONLY_SCOPES,
  TASK_KINDS,
  TASK_SCOPES,
  type TaskKind,
  type TaskScope,
} from "@/lib/reset/task-kinds";
import { RESET_RULE_TYPES, type ResetRule } from "@/lib/reset/types";
import { catalogOfKind, type GameCatalog } from "@/lib/roster/game-catalog";
import { isHttpUrl } from "@/lib/url";
import { CUSTOM_RULE, NO_RULE } from "./rule-choices";

// Turns the custom-task form into column values, or into errors per form field.

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

/**
 * Scopes a custom task may use (SPEC 4.1): cross-game tasks are scope user, game tasks
 * use the game scopes. Officers may also create guild tasks, ticked once for everyone.
 */
export function allowedScopes(
  catalog: GameCatalog | undefined,
  mayCreateGuildTasks: boolean,
): TaskScope[] {
  const guild: TaskScope[] = mayCreateGuildTasks ? ["guild"] : [];
  if (!catalog) {
    return ["user", ...guild];
  }
  const gameScopes = TASK_SCOPES.filter(
    (scope) =>
      !CUSTOM_ONLY_SCOPES.includes(scope) &&
      (scope !== "server" || catalog.game.meta.capabilities.servers),
  );
  return [...gameScopes, ...guild];
}

/** A shared resource level makes no sense for a whole guild; these kinds stay personal. */
export const GUILD_TASK_KINDS: readonly TaskKind[] = [
  "recurring",
  "counter",
  "lockout",
  "one_time",
];

export type ResolvedCustomTask =
  | {
      ok: true;
      values: Omit<
        typeof taskDefinitions.$inferInsert,
        "source" | "kind" | "scope"
      >;
    }
  | { ok: false; errors: CustomTaskErrors };

/** Validates the form and resolves the reset rule; game, kind and scope come checked. */
export function resolveCustomTaskInput(
  input: CustomTaskInput,
  catalog: GameCatalog | undefined,
  mayCreateGuildTasks: boolean,
): ResolvedCustomTask {
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
  if (
    !allowedScopes(catalog, mayCreateGuildTasks).includes(
      input.scope as TaskScope,
    )
  ) {
    errors.scope = "Dieser Geltungsbereich passt nicht zum Spiel.";
  } else if (input.scope === "guild" && !GUILD_TASK_KINDS.includes(kind)) {
    errors.kind = "Ressourcen gibt es nur pro Spieler, nicht für die Gilde.";
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
