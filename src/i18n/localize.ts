import type { LocalizedString } from "@/lib/packs/schema";

const UI_LANGUAGE = "de";
const FALLBACK_LANGUAGE = "en";

/** Pack texts: German, else English, else whatever exists (SPEC 6.1). */
export function localize(value: LocalizedString | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  return (
    value[UI_LANGUAGE] ??
    value[FALLBACK_LANGUAGE] ??
    Object.values(value)[0] ??
    ""
  );
}

/** All language variants, so searching finds "Jäger" as well as "Hunter". */
export function allTranslations(value: LocalizedString): string[] {
  return typeof value === "string" ? [value] : Object.values(value);
}
