const DISPLAY_TIMEZONE = "Europe/Berlin";

const dateTimeFormat = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: DISPLAY_TIMEZONE,
});

export function formatDateTime(date: Date): string {
  return dateTimeFormat.format(date);
}

const MINUTE_MS = 60_000;

/** Time left until `target`, e.g. "2 T. 4 Std." or "12 Min."; both as ISO strings. */
export function formatCountdown(target: string, now: string): string {
  const minutes = Math.max(
    0,
    Math.ceil((Date.parse(target) - Date.parse(now)) / MINUTE_MS),
  );
  const days = Math.floor(minutes / (24 * 60));
  const hours = Math.floor((minutes % (24 * 60)) / 60);
  const rest = minutes % 60;
  if (days > 0) {
    return `${days} T. ${hours} Std.`;
  }
  if (hours > 0) {
    return `${hours} Std. ${rest} Min.`;
  }
  return `${rest} Min.`;
}

/** YYYY-MM-DD in the display time zone, e.g. for file names. */
export function formatIsoDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DISPLAY_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
