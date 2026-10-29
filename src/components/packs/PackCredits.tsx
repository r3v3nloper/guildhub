import type { GameMeta } from "@/lib/db/schema";

/** The source line a pack's data provider requires wherever its data is shown. */
export function PackCredits({
  meta,
  label,
}: {
  meta: GameMeta;
  /** What the credited data is, e.g. "Rezeptdaten". */
  label: string;
}) {
  const credits = meta.credits ?? [];
  if (credits.length === 0) {
    return null;
  }
  return (
    // Bottom right, out of the way of the form, but visible as the data provider requires.
    <p className="-mb-2 text-right text-xs text-muted">
      {label}:{" "}
      {credits.map((credit, index) => (
        <span key={credit.url}>
          {index > 0 && ", "}
          <a
            href={credit.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:text-white"
          >
            {credit.label}
          </a>
        </span>
      ))}
    </p>
  );
}
