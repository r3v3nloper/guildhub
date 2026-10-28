const DISPLAY_TIMEZONE = "Europe/Berlin";

const dateTimeFormat = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: DISPLAY_TIMEZONE,
});

export function formatDateTime(date: Date): string {
  return dateTimeFormat.format(date);
}
