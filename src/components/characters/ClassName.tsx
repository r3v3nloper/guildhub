import { Badge } from "@/components/ui/ui";
import type { RosterEntryRef } from "@/lib/roster/roster";
import { localize } from "@/i18n/localize";
import { de } from "@/i18n/de";

/** Class name in its colour, with a badge when the pack no longer offers it. */
export function ClassName({ entry }: { entry: RosterEntryRef | null }) {
  if (!entry) {
    return <span className="text-muted">{de.common.none}</span>;
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden
        className="inline-block h-2.5 w-2.5 rounded-full border border-border"
        style={{ backgroundColor: entry.color ?? "transparent" }}
      />
      <span>{localize(entry.name)}</span>
      {entry.status !== "active" && (
        <Badge tone="warning">{de.badges[entry.status]}</Badge>
      )}
    </span>
  );
}
