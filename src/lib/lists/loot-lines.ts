import { splitNameNote } from "@/lib/name-note";
import { isHttpUrl } from "@/lib/url";

export interface LootEntry {
  name: string;
  link: string | null;
  notes: string | null;
}

const MAX_ENTRIES = 50;
const MAX_NAME = 100;
const MAX_NOTES = 200;
const URL_PATTERN = /https?:\/\/\S+/;

/**
 * Loot is edited as text, one item per line: "Name – Notiz", and a link anywhere in the
 * line is taken as the item's link, e.g. "Arkanitschnitter – BiS Krieger – https://…".
 */
export function parseLootLines(
  text: string,
): { ok: true; loot: LootEntry[] } | { ok: false; error: string } {
  const loot: LootEntry[] = [];
  for (const raw of text.split("\n")) {
    let line = raw.trim();
    if (!line) {
      continue;
    }
    const url = URL_PATTERN.exec(line)?.[0] ?? null;
    if (url) {
      if (!isHttpUrl(url)) {
        return { ok: false, error: `Ungültiger Link: ${url}` };
      }
      // Drop the link and a dash that only separated it.
      line = line
        .replace(url, "")
        .trim()
        .replace(/\s*[-–]$/, "")
        .trim();
    }
    loot.push({ ...splitNameNote(line), link: url });
  }

  if (loot.length > MAX_ENTRIES) {
    return { ok: false, error: `Höchstens ${MAX_ENTRIES} Items pro Boss.` };
  }
  if (loot.some((entry) => !entry.name || entry.name.length > MAX_NAME)) {
    return { ok: false, error: `Itemnamen mit 1 bis ${MAX_NAME} Zeichen.` };
  }
  if (loot.some((entry) => (entry.notes?.length ?? 0) > MAX_NOTES)) {
    return { ok: false, error: `Notizen höchstens ${MAX_NOTES} Zeichen.` };
  }
  return { ok: true, loot };
}

export function formatLootLines(loot: readonly LootEntry[]): string {
  return loot
    .map((entry) =>
      [entry.name, entry.notes, entry.link].filter(Boolean).join(" – "),
    )
    .join("\n");
}
