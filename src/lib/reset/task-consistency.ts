import { IANAZone } from "luxon";
import type { TaskKind } from "./task-kinds";
import type { ResetRule } from "./types";

/** A task definition as far as its kind rules are concerned; absent fields are undefined. */
export interface TaskShape {
  kind: TaskKind;
  hasResetRule: boolean;
  cap?: number;
  regen_amount?: number;
  regen_interval_minutes?: number;
  regen_alignment?: string;
  timezone?: string;
  per_period_gain?: number;
  alert_at?: number;
  bosses?: unknown[];
}

/** A finding about one field, named as in pack.json ("reset_rule_id" for the rule). */
export interface FieldIssue {
  field: string;
  message: string;
}

const REQUIRED: Partial<Record<TaskKind, Array<keyof TaskShape>>> = {
  counter: ["cap"],
  stacking: ["cap", "per_period_gain"],
  regen: ["cap", "regen_amount", "regen_interval_minutes"],
};

const ONLY_FOR: Array<[keyof TaskShape, TaskKind]> = [
  ["bosses", "lockout"],
  ["regen_amount", "regen"],
  ["regen_interval_minutes", "regen"],
  ["regen_alignment", "regen"],
  ["timezone", "regen"],
  ["per_period_gain", "stacking"],
];

/** Type consistency of a task (SPEC 6.5 A); shared by pack validation and custom tasks. */
export function taskConsistencyIssues(task: TaskShape): FieldIssue[] {
  const issues: FieldIssue[] = [];
  const issue = (field: string, message: string) =>
    issues.push({ field, message });
  const has = (value: unknown) => value !== undefined;

  if (
    ["recurring", "lockout", "stacking"].includes(task.kind) &&
    !task.hasResetRule
  ) {
    issue("reset_rule_id", `Pflicht bei kind ${task.kind}`);
  }
  if (task.kind === "one_time" && task.hasResetRule) {
    issue("reset_rule_id", "one_time hat keine Reset-Regel");
  }
  for (const field of REQUIRED[task.kind] ?? []) {
    if (!has(task[field])) {
      issue(field, `Pflicht bei kind ${task.kind}`);
    }
  }
  for (const [field, kind] of ONLY_FOR) {
    if (has(task[field]) && task.kind !== kind) {
      issue(field, `nur bei kind ${kind} erlaubt`);
    }
  }
  if (has(task.alert_at) && has(task.cap) && task.alert_at! > task.cap!) {
    issue("alert_at", "darf nicht größer als cap sein");
  }
  if (task.timezone && !IANAZone.isValidZone(task.timezone)) {
    issue("timezone", `unbekannte Zeitzone '${task.timezone}'`);
  }
  return issues;
}

/** Fields a rule type needs (SPEC 4.3), plus a valid zone if one is set. */
export function resetRuleIssues(rule: ResetRule): FieldIssue[] {
  const issues: FieldIssue[] = [];
  if (rule.timezone !== null && !IANAZone.isValidZone(rule.timezone)) {
    issues.push({
      field: "timezone",
      message: `unbekannte Zeitzone '${rule.timezone}'`,
    });
  }
  const required: Partial<Record<ResetRule["type"], Array<keyof ResetRule>>> = {
    weekly: ["weekday"],
    monthly: ["day_of_month"],
    every_n_days: ["n_days", "anchor"],
  };
  for (const field of required[rule.type] ?? []) {
    if (rule[field] === null) {
      issues.push({ field, message: `Pflicht bei type ${rule.type}` });
    }
  }
  return issues;
}
