import type { DateTime } from "luxon";
import {
  addDays,
  daysBetween,
  isoDate,
  localDateOf,
  minutesOfDay,
  parseIsoDate,
  resolveLocalTime,
  weekdayOf,
  type LocalDate,
} from "./local-time";
import type { Period, ResetRule } from "./types";

export class InvalidResetRuleError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "InvalidResetRuleError";
  }
}

/** SPEC 4.4: a rule's own zone wins over the region's. */
export function effectiveTimezone(rule: ResetRule, regionZone: string): string {
  return rule.timezone ?? regionZone;
}

/** The local date on which the period containing `now` began. */
function periodStartDate(
  rule: ResetRule,
  zone: string,
  now: DateTime,
): LocalDate {
  const today = localDateOf(now, zone);
  const startsAfterNow = (date: LocalDate) => startOf(rule, zone, date) > now;

  switch (rule.type) {
    case "daily":
      return startsAfterNow(today) ? addDays(today, -1) : today;

    case "weekly": {
      const weekday = required(rule.weekday, "weekday");
      const back = (weekdayOf(today) - weekday + 7) % 7;
      const candidate = addDays(today, -back);
      return startsAfterNow(candidate) ? addDays(candidate, -7) : candidate;
    }

    case "monthly": {
      const day = required(rule.day_of_month, "day_of_month");
      const candidate = { year: today.year, month: today.month, day };
      if (!startsAfterNow(candidate)) {
        return candidate;
      }
      return today.month === 1
        ? { year: today.year - 1, month: 12, day }
        : { year: today.year, month: today.month - 1, day };
    }

    case "every_n_days": {
      const days = required(rule.n_days, "n_days");
      const anchor = parseIsoDate(required(rule.anchor, "anchor"));
      if (startsAfterNow(anchor)) {
        throw new InvalidResetRuleError(
          `Anker ${rule.anchor} liegt in der Zukunft`,
        );
      }
      const elapsed = daysBetween(anchor, today);
      const candidate = addDays(anchor, elapsed - (elapsed % days));
      return startsAfterNow(candidate) ? addDays(candidate, -days) : candidate;
    }
  }
}

function nextStartDate(rule: ResetRule, start: LocalDate): LocalDate {
  switch (rule.type) {
    case "daily":
      return addDays(start, 1);
    case "weekly":
      return addDays(start, 7);
    case "every_n_days":
      return addDays(start, required(rule.n_days, "n_days"));
    case "monthly":
      return start.month === 12
        ? { year: start.year + 1, month: 1, day: start.day }
        : { year: start.year, month: start.month + 1, day: start.day };
  }
}

function startOf(rule: ResetRule, zone: string, date: LocalDate): DateTime {
  return resolveLocalTime(date, minutesOfDay(rule.time), zone);
}

function required<T>(value: T | null, field: string): T {
  if (value === null) {
    throw new InvalidResetRuleError(`${field} fehlt`);
  }
  return value;
}

/**
 * The period `now` falls into. The key is the local date of the period start, not an ISO
 * week, because ISO weeks begin on Monday and would split other reset days (SPEC 5.1).
 */
export function getPeriod(
  rule: ResetRule,
  zone: string,
  now: DateTime,
): Period {
  const startDate = periodStartDate(rule, zone, now);
  return {
    start: startOf(rule, zone, startDate),
    next: startOf(rule, zone, nextStartDate(rule, startDate)),
    key: `${rule.type}:${isoDate(startDate)}`,
  };
}

export function getPeriodStart(
  rule: ResetRule,
  zone: string,
  now: DateTime,
): DateTime {
  return getPeriod(rule, zone, now).start;
}

export function getNextReset(
  rule: ResetRule,
  zone: string,
  now: DateTime,
): DateTime {
  return getPeriod(rule, zone, now).next;
}

export function getPeriodKey(
  rule: ResetRule,
  zone: string,
  now: DateTime,
): string {
  return getPeriod(rule, zone, now).key;
}

/** Period starts in (after, until], newest first; stops early once `limit` are found. */
export function countPeriodStarts(
  rule: ResetRule,
  zone: string,
  after: DateTime,
  until: DateTime,
  limit = Number.POSITIVE_INFINITY,
): number {
  // every_n_days has no periods before its anchor.
  const earliest =
    rule.type === "every_n_days"
      ? startOf(rule, zone, parseIsoDate(required(rule.anchor, "anchor")))
      : undefined;
  let count = 0;
  let start = getPeriodStart(rule, zone, until);
  while (start > after && count < limit) {
    count++;
    if (earliest && start <= earliest) {
      break;
    }
    start = getPeriodStart(rule, zone, start.minus({ milliseconds: 1 }));
  }
  return count;
}
