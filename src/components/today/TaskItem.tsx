import type { DashboardItem } from "@/lib/tasks/dashboard";
import { CheckTask } from "./CheckTask";
import { CounterTask } from "./CounterTask";
import { LockoutTask } from "./LockoutTask";
import { ResourceTask } from "./ResourceTask";

/** Picks the control that fits the task kind (SPEC 7, item 3). */
export function TaskItem({ item, now }: { item: DashboardItem; now: string }) {
  switch (item.kind) {
    case "counter":
      return <CounterTask item={item} now={now} />;
    case "lockout":
      return item.bosses.length > 0 ? (
        <LockoutTask item={item} now={now} />
      ) : (
        <CheckTask item={item} now={now} />
      );
    case "regen":
    case "stacking":
      return <ResourceTask item={item} now={now} />;
    case "recurring":
    case "one_time":
      return <CheckTask item={item} now={now} />;
  }
}
