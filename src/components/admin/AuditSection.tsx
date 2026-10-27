import { Card } from "@/components/ui/ui";
import type { AuditView } from "@/lib/audit/audit";
import { de } from "@/i18n/de";

const dateFormat = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Europe/Berlin",
});

const ACTION_LABELS: Record<string, string> = {
  "allowlist.add": "hat freigeschaltet",
  "allowlist.remove": "hat Freischaltung entfernt",
  "member.disable": "hat deaktiviert",
  "member.reactivate": "hat reaktiviert",
  "member.role": "hat Rolle geändert",
  "member.purge": "hat Daten gelöscht",
  "guild.rename": "hat Gilde umbenannt",
  "game.enable": "hat Spiel aktiviert",
  "game.disable": "hat Spiel deaktiviert",
  "game.region": "hat Region gewählt",
  "backup.download": "hat Backup geladen",
};

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
                {dateFormat.format(entry.at)}
              </span>{" "}
              <span className="font-medium">{entry.actorName ?? "?"}</span>{" "}
              {ACTION_LABELS[entry.action] ?? entry.action}:{" "}
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
