"use client";

import { useOptimistic } from "react";
import type { DashboardItem } from "@/lib/tasks/dashboard";
import { de } from "@/i18n/de";
import { ItemShell } from "./ItemShell";
import { ResetCountdown } from "./ResetCountdown";
import { setTaskDoneAction } from "./today-actions";
import { useLongPress } from "./use-long-press";
import { useOptimisticAction } from "@/components/ui/use-optimistic-action";

/** recurring, one_time and lockouts without bosses: one tap toggles done. */
export function CheckTask({ item, now }: { item: DashboardItem; now: string }) {
  const [done, setDone] = useOptimistic(item.status === "done");
  const { pending, error, run } = useOptimisticAction();
  const target = { taskId: item.taskId, characterId: item.characterId };
  const press = useLongPress(() =>
    run(
      () => setTaskDoneAction(target, !done),
      () => setDone(!done),
    ),
  );

  return (
    <ItemShell
      {...item}
      done={done}
      pending={pending}
      error={error}
      pressHandlers={press}
      pressLabel={item.title}
      indicator={
        <i
          className={`pi text-xl ${done ? "pi-check-circle text-green-500" : "pi-circle text-muted"}`}
          aria-hidden
        />
      }
      meta={
        done ? (
          item.doneBy && <span>{de.today.doneBy(item.doneBy)}</span>
        ) : (
          <ResetCountdown item={item} now={now} />
        )
      }
    />
  );
}
