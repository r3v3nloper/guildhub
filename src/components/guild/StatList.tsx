import type { StatPriorityRow } from "@/lib/guild/stat-priorities";
import { de } from "@/i18n/de";

/** One ranking: "Stärke › Krit › Tempo", with note and source. */
export function StatList({ priority }: { priority: StatPriorityRow }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium">{priority.title}</span>
      <ol className="flex flex-wrap items-center gap-x-1 text-sm">
        {priority.stats.map((stat, index) => (
          <li key={stat} className="flex items-center gap-1">
            {index > 0 && (
              <i className="pi pi-angle-right text-xs text-muted" aria-hidden />
            )}
            {stat}
          </li>
        ))}
      </ol>
      {priority.notes && (
        <span className="text-xs whitespace-pre-line text-muted">
          {priority.notes}
        </span>
      )}
      {priority.source && (
        <a
          href={priority.source}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted hover:text-accent"
        >
          {de.statPriorities.sourceLink}
        </a>
      )}
    </div>
  );
}
