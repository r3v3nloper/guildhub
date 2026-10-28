import { Badge, Card } from "@/components/ui/ui";
import type { SyncLogEntry } from "@/lib/packs/status";
import type { CatalogEntry } from "@/lib/guild/games-admin";
import { formatDateTime } from "@/i18n/format";
import { localize } from "@/i18n/localize";
import { de } from "@/i18n/de";

const kindLabel = (kind: string) => de.catalogKinds[kind] ?? kind;

function SyncSummaryLine({ entry }: { entry: SyncLogEntry }) {
  const summary = entry.summary;
  if (entry.status === "error") {
    return (
      <pre className="whitespace-pre-wrap text-xs text-red-600 dark:text-red-400">
        {entry.error}
      </pre>
    );
  }
  if (!summary) {
    return <span className="text-muted">{de.admin.syncUnchanged}</span>;
  }
  return (
    <span className="flex flex-col gap-1">
      <span>
        {entry.fromVersion ?? de.admin.syncNew} → {entry.toVersion}:{" "}
        {de.admin.syncSummary(summary)}
      </span>
      {summary.migrations.map((migration) => (
        <span
          key={`${migration.kind}:${migration.from}`}
          className="text-muted"
        >
          {kindLabel(migration.kind)} {migration.from} → {migration.to}:{" "}
          {de.admin.syncMigration(
            migration.rows_rewritten,
            migration.rows_merged,
          )}
        </span>
      ))}
      {summary.affected_characters.length > 0 && (
        <span className="text-orange-500">
          {summary.affected_characters.length} {de.admin.affectedCharacters} (
          {summary.affected_characters
            .map((a) => `${kindLabel(a.field)} ${a.old_id}`)
            .join(", ")}
          )
        </span>
      )}
    </span>
  );
}

export function PacksSection({
  latest,
  history,
  todoEntries,
}: {
  latest: SyncLogEntry[];
  history: SyncLogEntry[];
  todoEntries: CatalogEntry[];
}) {
  const todoByGame = Map.groupBy(todoEntries, (entry) => entry.gameId);

  return (
    <Card title={de.admin.packs}>
      <ul className="mb-4 flex flex-col gap-3 text-sm">
        {latest.map((entry) => (
          <li key={entry.gameId} className="flex flex-col gap-1">
            <span className="flex items-center gap-2">
              <span className="font-medium">{entry.gameId}</span>
              <Badge tone={entry.status === "error" ? "danger" : "neutral"}>
                {entry.status}
              </Badge>
              <span className="text-xs text-muted">
                {formatDateTime(entry.startedAt)}
              </span>
            </span>
            <SyncSummaryLine entry={entry} />
          </li>
        ))}
      </ul>

      <details className="mb-3">
        <summary className="cursor-pointer text-sm font-medium">
          {de.admin.todoEntries} ({todoEntries.length})
        </summary>
        {todoEntries.length === 0 ? (
          <p className="mt-2 text-sm text-muted">{de.admin.noTodo}</p>
        ) : (
          [...todoByGame].map(([gameId, entries]) => (
            <div key={gameId} className="mt-2 text-sm">
              <span className="font-medium">{gameId}</span>
              <p className="text-muted">
                {entries
                  .map(
                    (entry) =>
                      `${kindLabel(entry.kind)}: ${localize(entry.name)}`,
                  )
                  .join(" · ")}
              </p>
            </div>
          ))
        )}
      </details>

      <details>
        <summary className="cursor-pointer text-sm font-medium">
          {de.admin.syncHistory}
        </summary>
        <ul className="mt-2 flex flex-col gap-2 text-sm">
          {history.map((entry) => (
            <li key={entry.id} className="flex flex-col">
              <span className="text-xs text-muted">
                {formatDateTime(entry.startedAt)} · {entry.gameId} ·{" "}
                {entry.status}
              </span>
              <SyncSummaryLine entry={entry} />
            </li>
          ))}
        </ul>
      </details>
    </Card>
  );
}
