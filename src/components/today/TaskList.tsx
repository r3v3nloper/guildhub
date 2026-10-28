import type { DashboardItem } from "@/lib/tasks/dashboard";
import { de } from "@/i18n/de";
import { TaskItem } from "./TaskItem";

/** Open tasks and resources first; finished ones folded away (SPEC 7, item 3). */
export function TaskList({
  items,
  now,
  allDoneLabel,
}: {
  items: DashboardItem[];
  now: string;
  /** Shown instead of an empty list once everything is ticked. */
  allDoneLabel?: string;
}) {
  if (items.length === 0) {
    return null;
  }
  const done = items.filter((item) => item.status === "done");
  const pending = items.filter((item) => item.status !== "done");

  return (
    <div className="flex flex-col">
      {pending.length === 0 && allDoneLabel ? (
        <p className="flex items-center gap-2.5 px-3 py-3.5 text-sm font-semibold text-success">
          <i className="pi pi-check" aria-hidden />
          {allDoneLabel}
        </p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {pending.map((item) => (
            <TaskItem key={itemKey(item)} item={item} now={now} />
          ))}
        </ul>
      )}
      {done.length > 0 && (
        <details className="group mt-1 border-t border-dashed border-[#2a2541] pt-1">
          <summary className="flex min-h-10 cursor-pointer list-none items-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold text-muted hover:bg-raised hover:text-foreground [&::-webkit-details-marker]:hidden">
            {de.today.done(done.length)}
            <i
              className="pi pi-chevron-down text-xs transition-transform group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <ul className="flex flex-col gap-0.5">
            {done.map((item) => (
              <TaskItem key={itemKey(item)} item={item} now={now} />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function itemKey(item: DashboardItem): string {
  return `${item.taskId}-${item.characterId ?? "all"}`;
}
