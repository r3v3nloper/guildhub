/** "Name – Notiz": a spaced dash (or a leading one) separates the optional note. */
const NOTE_SEPARATOR = /(?:^|\s)[-–]\s/;

/** Splits one line of a text-edited list (recipes, loot) into name and note. */
export function splitNameNote(line: string): {
  name: string;
  notes: string | null;
} {
  const match = NOTE_SEPARATOR.exec(line);
  if (!match) {
    return { name: line.trim(), notes: null };
  }
  return {
    name: line.slice(0, match.index).trim(),
    notes: line.slice(match.index + match[0].length).trim() || null,
  };
}
