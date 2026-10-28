"use client";

import { Checkbox } from "primereact/checkbox";
import { useOptimistic, useState } from "react";
import type { BossView, DashboardItem } from "@/lib/tasks/dashboard";
import { de } from "@/i18n/de";
import { ValuePill } from "./indicators";
import { ItemShell } from "./ItemShell";
import { ResetCountdown } from "./ResetCountdown";
import { setBossKilledAction } from "./today-actions";
import { useLongPress } from "./use-long-press";
import { useOptimisticAction } from "@/components/ui/use-optimistic-action";

/** lockout with a boss list: tap opens the list, each boss is ticked on its own. */
export function LockoutTask({
  item,
  now,
}: {
  item: DashboardItem;
  now: string;
}) {
  const [open, setOpen] = useState(false);
  const [bosses, toggleBoss] = useOptimistic(
    item.bosses,
    (current: BossView[], key: string) =>
      current.map((boss) =>
        boss.key === key ? { ...boss, killed: !boss.killed } : boss,
      ),
  );
  const { pending, error, run } = useOptimisticAction();
  const target = { taskId: item.taskId, characterId: item.characterId };
  const killed = bosses.filter((boss) => boss.killed).length;
  const done = item.status === "done" || killed === bosses.length;
  const press = useLongPress(() => setOpen(!open));

  return (
    <ItemShell
      {...item}
      done={done}
      pending={pending}
      error={error}
      pressHandlers={{ ...press, "aria-expanded": open }}
      pressLabel={`${item.title}: ${de.today.bossesOf(killed, bosses.length)}`}
      expanded={open}
      indicator={
        <ValuePill tone={done ? "done" : "neutral"}>
          {killed}/{bosses.length}
        </ValuePill>
      }
      meta={!done && <ResetCountdown item={item} now={now} />}
    >
      {open && (
        <ul className="mb-2 grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-x-4 gap-y-0.5 pr-2 pl-[84px]">
          {bosses.map((boss) => {
            const id = `boss-${item.taskId}-${item.characterId}-${boss.key}`;
            return (
              <li key={boss.key} className="flex min-h-9 items-center gap-2.5">
                <Checkbox
                  inputId={id}
                  checked={boss.killed}
                  onChange={() =>
                    run(
                      () => setBossKilledAction(target, boss.key, !boss.killed),
                      () => toggleBoss(boss.key),
                    )
                  }
                />
                <label
                  htmlFor={id}
                  className={`cursor-pointer text-sm ${boss.killed ? "text-muted line-through" : ""}`}
                >
                  {boss.name}
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </ItemShell>
  );
}
