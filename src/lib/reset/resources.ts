import type { DateTime } from "luxon";
import {
  addDays,
  daysBetween,
  localDateOf,
  resolveLocalTime,
} from "./local-time";
import { countPeriodStarts } from "./periods";
import type { ResetRule } from "./types";

/** The last value the player reported, and when (SPEC 5.3). */
export interface ResourceSnapshot {
  value: number;
  valueAt: DateTime;
}

export interface RegenSettings {
  cap: number;
  regenAmount: number;
  regenIntervalMinutes: number;
  regenAlignment: "fixed" | "relative";
}

export interface StackingSettings {
  cap: number;
  perPeriodGain: number;
}

const MINUTES_PER_DAY = 24 * 60;

function clamp(value: number, cap: number): number {
  return Math.max(0, Math.min(cap, value));
}

/** Ticks still needed before the value reaches the cap. */
function ticksToCap(task: RegenSettings, value: number): number {
  return Math.max(0, Math.ceil((task.cap - value) / task.regenAmount));
}

/**
 * Fixed ticks run on the local wall clock from midnight (00:00, 03:00 … for 180 min), also
 * on DST days: a tick in the gap moves to its end, a tick in the repeated hour counts once.
 * Yields the tick instants in (after, until], in order.
 */
function* fixedTicks(
  intervalMinutes: number,
  zone: string,
  after: DateTime,
  until: DateTime,
): Generator<DateTime> {
  const firstDay = localDateOf(after, zone);
  const days = daysBetween(firstDay, localDateOf(until, zone));
  for (let offset = 0; offset <= days; offset++) {
    const date = addDays(firstDay, offset);
    for (let minute = 0; minute < MINUTES_PER_DAY; minute += intervalMinutes) {
      const tick = resolveLocalTime(date, minute, zone);
      if (tick > until) {
        return;
      }
      if (tick > after) {
        yield tick;
      }
    }
  }
}

function countTicks(
  task: RegenSettings,
  zone: string,
  after: DateTime,
  until: DateTime,
  limit: number,
): number {
  if (task.regenAlignment === "relative") {
    const elapsed = until.toMillis() - after.toMillis();
    const ticks = Math.floor(elapsed / (task.regenIntervalMinutes * 60_000));
    return Math.min(limit, Math.max(0, ticks));
  }
  const ticks = fixedTicks(task.regenIntervalMinutes, zone, after, until);
  let count = 0;
  while (count < limit && !ticks.next().done) {
    count++;
  }
  return count;
}

/** Projected value of a regenerating resource; ticks in (valueAt, now] count. */
export function projectRegen(
  task: RegenSettings,
  zone: string,
  snapshot: ResourceSnapshot,
  now: DateTime,
): number {
  const limit = ticksToCap(task, snapshot.value);
  const ticks =
    limit === 0 ? 0 : countTicks(task, zone, snapshot.valueAt, now, limit);
  return clamp(snapshot.value + ticks * task.regenAmount, task.cap);
}

/** When the resource reaches its cap, or undefined if it already has. */
export function regenFullAt(
  task: RegenSettings,
  zone: string,
  snapshot: ResourceSnapshot,
  now: DateTime,
): DateTime | undefined {
  const value = projectRegen(task, zone, snapshot, now);
  const missing = ticksToCap(task, value);
  if (missing === 0) {
    return undefined;
  }
  if (task.regenAlignment === "relative") {
    const interval = task.regenIntervalMinutes * 60_000;
    const elapsed = now.toMillis() - snapshot.valueAt.toMillis();
    const done = Math.floor(elapsed / interval);
    return snapshot.valueAt.plus({ milliseconds: (done + missing) * interval });
  }
  // Generous horizon: enough days to fit all missing ticks.
  const days =
    Math.ceil((missing * task.regenIntervalMinutes) / MINUTES_PER_DAY) + 2;
  let seen = 0;
  for (const tick of fixedTicks(
    task.regenIntervalMinutes,
    zone,
    now,
    now.plus({ days }),
  )) {
    if (++seen === missing) {
      return tick;
    }
  }
  return undefined;
}

/** Projected value of a stacking resource: one gain per period start in (valueAt, now]. */
export function projectStacking(
  task: StackingSettings,
  rule: ResetRule,
  zone: string,
  snapshot: ResourceSnapshot,
  now: DateTime,
): number {
  const limit = Math.max(
    0,
    Math.ceil((task.cap - snapshot.value) / task.perPeriodGain),
  );
  const periods =
    limit === 0
      ? 0
      : countPeriodStarts(rule, zone, snapshot.valueAt, now, limit);
  return clamp(snapshot.value + periods * task.perPeriodGain, task.cap);
}
