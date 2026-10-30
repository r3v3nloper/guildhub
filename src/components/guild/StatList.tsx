import type { ReactNode } from "react";
import type { StatPriorityRow } from "@/lib/guild/stat-priorities";
import { de } from "@/i18n/de";

/**
 * One ranking as a numbered list, the most important stat first and largest, with
 * note and source. `menu` sits beside the title (edit/delete for officers).
 */
export function StatList({
  priority,
  menu,
}: {
  priority: StatPriorityRow;
  menu?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="pt-0.5 text-[15px] font-bold text-white">
          {priority.title}
        </h3>
        {menu && <span className="-mt-2 -mr-2">{menu}</span>}
      </div>
      <ol className="flex flex-col gap-1.5">
        {priority.stats.map((stat, index) => (
          <li
            key={stat}
            className={`flex items-center gap-3 rounded-xl px-2.5 py-1.5 ${
              index === 0 ? "bg-accent-soft" : ""
            }`}
          >
            <span
              aria-hidden
              className={`flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums ${
                index === 0 ? "bg-accent text-on-accent" : "bg-chip text-soft"
              }`}
            >
              {index + 1}
            </span>
            <span
              className={
                index === 0
                  ? "text-[15px] font-bold text-white"
                  : "text-sm font-semibold text-foreground"
              }
            >
              {stat}
            </span>
          </li>
        ))}
      </ol>
      {(priority.notes || priority.source) && (
        <div className="flex flex-col gap-1.5 border-t border-border pt-2.5">
          {priority.notes && (
            <p className="text-[13px] whitespace-pre-line text-soft">
              {priority.notes}
            </p>
          )}
          {priority.source && (
            <a
              href={priority.source}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-1.5 text-[13px] font-semibold text-accent-strong hover:text-white"
            >
              {de.statPriorities.sourceLink}
              <i className="pi pi-external-link text-[10px]" aria-hidden />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
