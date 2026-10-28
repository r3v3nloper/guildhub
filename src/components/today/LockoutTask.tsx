"use client";

import { Checkbox } from "primereact/checkbox";
import { useOptimistic, useState } from "react";
import type { BossView, DashboardItem } from "@/lib/tasks/dashboard";
import { de } from "@/i18n/de";
import { ItemShell } from "./ItemShell";
import { ResetCountdown } from "./ResetCountdown";
import { setBossKilledAction } from "./today-actions";
import { useLongPress } from "./use-long-press";
import { useProgressAction } from "./use-progress-action";

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
  const { pending, error, run } = useProgressAction();
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
      indicator={
        <span className="rounded-full bg-border px-2 py-0.5 text-sm font-semibold tabular-nums">
          {killed}/{bosses.length}
        </span>
      }
      meta={!done && <ResetCountdown item={item} now={now} />}
    >
      {open && (
        <ul className="ml-14 flex flex-col gap-2">
          {bosses.map((boss) => {
            const id = `boss-${item.taskId}-${item.characterId}-${boss.key}`;
            return (
              <li key={boss.key} className="flex items-center gap-2">
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
                <label htmlFor={id}>{boss.name}</label>
              </li>
            );
          })}
        </ul>
      )}
    </ItemShell>
  );
}
