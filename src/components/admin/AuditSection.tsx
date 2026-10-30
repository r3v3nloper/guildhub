import { Card } from "@/components/ui/ui";
import type { AuditView } from "@/lib/audit/audit";
import { de } from "@/i18n/de";
import { formatDateTime } from "@/i18n/format";

/** The newest entries stay in view; older ones fold away. */
const AUDIT_SHOWN = 10;

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
        <p className="text-sm text-muted">{de.admin.noAudit}</p>
      ) : (
        <>
          <AuditList
            entries={entries.slice(0, AUDIT_SHOWN)}
            memberNames={memberNames}
          />
          {entries.length > AUDIT_SHOWN && (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-semibold text-accent-strong hover:text-white">
                {de.admin.olderAudit(entries.length - AUDIT_SHOWN)}
              </summary>
              <div className="mt-2">
                <AuditList
                  entries={entries.slice(AUDIT_SHOWN)}
                  memberNames={memberNames}
                />
              </div>
            </details>
          )}
        </>
      )}
    </Card>
  );
}

function AuditList({
  entries,
  memberNames,
}: {
  entries: AuditView[];
  memberNames: Map<string, string | null>;
}) {
  return (
    <ul className="flex flex-col divide-y divide-border text-sm">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className="flex flex-col gap-0.5 py-2 sm:flex-row sm:gap-3"
        >
          <span className="shrink-0 text-xs text-muted tabular-nums sm:w-28 sm:pt-0.5">
            {formatDateTime(entry.at)}
          </span>
          <span>
            <span className="font-semibold text-white">
              {entry.actorName ?? de.admin.unknownActor}
            </span>{" "}
            {de.auditActions[entry.action] ?? entry.action}:{" "}
            {(entry.target && memberNames.get(entry.target)) ?? entry.target}
            {entry.details &&
              "to" in entry.details &&
              ` → ${String(entry.details.to)}`}
          </span>
        </li>
      ))}
    </ul>
  );
}
