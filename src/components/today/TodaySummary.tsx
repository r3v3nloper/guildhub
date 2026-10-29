import type { DashboardSummary } from "@/lib/tasks/dashboard-summary";
import { de } from "@/i18n/de";

/** Head of the overview: how much is left, and which resources want spending. */
export function TodaySummary({ summary }: { summary: DashboardSummary }) {
  const open = summary.total - summary.done;
  const percent =
    summary.total === 0 ? 0 : Math.round((summary.done / summary.total) * 100);

  return (
    <section
      aria-label={de.today.progressTitle}
      className="grid gap-4 md:grid-cols-2"
    >
      <div className="flex flex-col gap-4 rounded-[22px] border border-border bg-surface p-5 md:p-6">
        <span className="text-xs font-bold tracking-widest text-muted uppercase">
          {de.today.progressTitle}
        </span>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-display text-4xl leading-none font-semibold text-white">
            {de.today.openShort(open)}
          </span>
          <span className="text-muted">
            {de.today.doneOf(summary.done, summary.total)}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label={de.today.progressLabel}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="h-3 overflow-hidden rounded-full bg-chip"
        >
          <div
            className="gh-rainbow h-full rounded-full transition-[width] duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-[22px] border border-border bg-surface p-5 md:p-6">
        <span className="flex items-center gap-2 text-xs font-bold tracking-widest text-warning uppercase">
          <i className="pi pi-bolt" aria-hidden />
          {de.today.fullTitle}
        </span>
        {summary.full.length === 0 ? (
          <p className="text-sm text-muted">{de.today.nothingFull}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {summary.full.map((resource) => (
              <li
                key={resource.key}
                className="flex items-center gap-3 rounded-2xl bg-raised px-3 py-2.5"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                  {resource.title}
                  {resource.owner && (
                    <span className="font-normal text-muted">
                      {" "}
                      · {resource.owner}
                    </span>
                  )}
                </span>
                <span className="rounded-full bg-warning-soft px-2.5 py-1 text-[13px] font-bold text-warning tabular-nums">
                  {resource.value}/{resource.cap}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
