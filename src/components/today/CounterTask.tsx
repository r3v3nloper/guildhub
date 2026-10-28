"use client";

import { useOptimistic } from "react";
import type { DashboardItem } from "@/lib/tasks/dashboard";
import { Button } from "@/components/ui/ui";
import { de } from "@/i18n/de";
import { ItemShell } from "./ItemShell";
import { ResetCountdown } from "./ResetCountdown";
import { adjustCounterAction } from "./today-actions";
import { useLongPress } from "./use-long-press";
import { useOptimisticAction } from "@/components/ui/use-optimistic-action";

/** counter: tap = +1, long press or the minus button = −1. */
export function CounterTask({
  item,
  now,
}: {
  item: DashboardItem;
  now: string;
}) {
  const cap = item.cap ?? Number.POSITIVE_INFINITY;
  const [value, setValue] = useOptimistic(item.value);
  const { pending, error, run } = useOptimisticAction();
  const target = { taskId: item.taskId, characterId: item.characterId };
  const done = value >= cap;

  const change = (delta: 1 | -1) => {
    const next = Math.max(0, Math.min(cap, value + delta));
    if (next === value) {
      return;
    }
    run(
      () => adjustCounterAction(target, delta),
      () => setValue(next),
    );
  };
  const press = useLongPress(
    () => change(1),
    () => change(-1),
  );

  return (
    <ItemShell
      {...item}
      done={done}
      pending={pending}
      error={error}
      pressHandlers={press}
      pressLabel={`${item.title}: ${value}${item.cap ? ` / ${item.cap}` : ""}. ${de.today.longPressHint}`}
      indicator={
        <span
          className={`rounded-full px-2 py-0.5 text-sm font-semibold tabular-nums ${done ? "bg-green-500/20 text-green-600" : "bg-border"}`}
        >
          {value}
          {item.cap !== null && `/${item.cap}`}
        </span>
      }
      meta={!done && <ResetCountdown item={item} now={now} />}
      actions={
        <Button
          type="button"
          variant="secondary"
          icon="pi pi-minus"
          aria-label={de.today.decrease}
          title={de.today.decrease}
          disabled={value === 0}
          onClick={() => change(-1)}
        />
      }
    />
  );
}
