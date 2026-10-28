import { DateTime } from "luxon";

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

/** A calendar date without a zone, as the reset rules think about days. */
export interface LocalDate {
  year: number;
  month: number;
  day: number;
}

export function localDateOf(instant: DateTime, zone: string): LocalDate {
  const local = instant.setZone(zone);
  return { year: local.year, month: local.month, day: local.day };
}

/** Calendar arithmetic in UTC, where every day has 24 hours. */
export function addDays(date: LocalDate, days: number): LocalDate {
  const shifted = DateTime.utc(date.year, date.month, date.day).plus({ days });
  return { year: shifted.year, month: shifted.month, day: shifted.day };
}

export function weekdayOf(date: LocalDate): number {
  return DateTime.utc(date.year, date.month, date.day).weekday;
}

export function daysBetween(from: LocalDate, to: LocalDate): number {
  const start = DateTime.utc(from.year, from.month, from.day);
  const end = DateTime.utc(to.year, to.month, to.day);
  return Math.round(end.diff(start, "days").days);
}

export function isoDate(date: LocalDate): string {
  return DateTime.utc(date.year, date.month, date.day).toISODate()!;
}

export function parseIsoDate(value: string): LocalDate {
  const parsed = DateTime.fromISO(value, { zone: "utc" });
  return { year: parsed.year, month: parsed.month, day: parsed.day };
}

/** "HH:MM" → minutes after midnight. */
export function minutesOfDay(time: string): number {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

/**
 * The instant at which a local wall-clock time occurs, with the DST rules of SPEC 5.2:
 * a time inside the spring-forward gap resolves to the first valid instant after the gap,
 * a time in the repeated autumn hour to its first occurrence.
 */
export function resolveLocalTime(
  date: LocalDate,
  minuteOfDay: number,
  zone: string,
): DateTime {
  const wall =
    Date.UTC(date.year, date.month - 1, date.day) + minuteOfDay * MINUTE_MS;
  const offsetAt = (ms: number) =>
    DateTime.fromMillis(ms, { zone }).offset * MINUTE_MS;
  const wallOf = (ms: number) => ms + offsetAt(ms);

  // Each offset in force around that day yields one candidate; a candidate is real if
  // the zone shows exactly that wall time at it. Two real ones = the repeated hour.
  const offsets = new Set([
    offsetAt(wall - 24 * HOUR_MS),
    offsetAt(wall),
    offsetAt(wall + 24 * HOUR_MS),
  ]);
  const occurrences = [...offsets]
    .map((offset) => wall - offset)
    .filter((candidate) => wallOf(candidate) === wall)
    .sort((a, b) => a - b);
  if (occurrences.length > 0) {
    return DateTime.fromMillis(occurrences[0], { zone });
  }

  // Inside the gap: the clock jumps over `wall`, so the first instant whose wall time is
  // at or past it is the transition itself.
  let low = wall - 15 * HOUR_MS;
  let high = wall + 15 * HOUR_MS;
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (wallOf(middle) >= wall) {
      high = middle;
    } else {
      low = middle;
    }
  }
  return DateTime.fromMillis(high, { zone });
}
