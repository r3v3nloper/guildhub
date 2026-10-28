import { Card } from "@/components/ui/ui";
import type { AuditView } from "@/lib/audit/audit";
import { de } from "@/i18n/de";
import { formatDateTime } from "@/i18n/format";

export function AuditSection({
  entries,
  memberNames,
}: {
  entries: AuditView[];
  /** Resolves user IDs in `target` to names where possible. */
  memberNames: Map<string, string | null>;
}) {
  return (
    <Card title={de.admin.audit}>
      {entries.length === 0 ? (
        <p className="text-sm text-zinc-500">{de.admin.noAudit}</p>
      ) : (
        <ul className="flex flex-col gap-1 text-sm">
          {entries.map((entry) => (
            <li key={entry.id}>
              <span className="text-xs text-zinc-500">
                {formatDateTime(entry.at)}
              </span>{" "}
              <span className="font-medium">
                {entry.actorName ?? de.admin.unknownActor}
              </span>{" "}
              {de.auditActions[entry.action] ?? entry.action}:{" "}
              {(entry.target && memberNames.get(entry.target)) ?? entry.target}
              {entry.details &&
                "to" in entry.details &&
                ` → ${String(entry.details.to)}`}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
