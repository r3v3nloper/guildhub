const DISPLAY_TIMEZONE = "Europe/Berlin";

const dateTimeFormat = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: DISPLAY_TIMEZONE,
});

export function formatDateTime(date: Date): string {
  return dateTimeFormat.format(date);
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
