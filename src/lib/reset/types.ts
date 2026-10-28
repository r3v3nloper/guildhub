import type { DateTime } from "luxon";

export const RESET_RULE_TYPES = [
  "daily",
  "weekly",
  "every_n_days",
  "monthly",
] as const;
export type ResetRuleType = (typeof RESET_RULE_TYPES)[number];

/** A reset rule as SPEC 4.3 describes it; pack rules and custom rules share this shape. */
export interface ResetRule {
  type: ResetRuleType;
  /** Local time "HH:MM" in the effective time zone. */
  time: string;
  /** Overrides the region's zone, e.g. "UTC" for a worldwide reset. */
  timezone: string | null;
  /** 1 = Monday … 7 = Sunday; weekly only. */
  weekday: number | null;
  /** 1–28; monthly only. */
  day_of_month: number | null;
  /** every_n_days only. */
  n_days: number | null;
  /** ISO date of the first period start; every_n_days only. */
  anchor: string | null;
}

export interface Period {
  start: DateTime;
  next: DateTime;
  key: string;
}
