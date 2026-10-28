import type { DashboardItem } from "@/lib/tasks/dashboard";
import { de } from "@/i18n/de";
import { TaskItem } from "./TaskItem";

/** Open tasks and resources first; finished ones folded away (SPEC 7, item 3). */
export function TaskList({
  items,
  now,
}: {
  items: DashboardItem[];
  now: string;
}) {
  if (items.length === 0) {
    return null;
  }
  const done = items.filter((item) => item.status === "done");
  const pending = items.filter((item) => item.status !== "done");

  return (
    <div className="flex flex-col">
      <ul className="divide-y divide-border">
        {pending.map((item) => (
          <TaskItem key={itemKey(item)} item={item} now={now} />
        ))}
      </ul>
      {done.length > 0 && (
        <details className="mt-1">
          <summary className="cursor-pointer py-1 text-sm text-muted">
            {de.today.done(done.length)}
          </summary>
          <ul className="divide-y divide-border">
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
