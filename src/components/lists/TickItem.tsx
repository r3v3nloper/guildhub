"use client";

import { Checkbox } from "primereact/checkbox";
import { useOptimistic } from "react";
import { useProgressAction } from "@/components/today/use-progress-action";
import { Button } from "@/components/ui/ui";
import type { ActionState } from "@/lib/actions/action-state";
import { de } from "@/i18n/de";

/** A checkbox row that ticks optimistically; to-do entries and checklist points. */
export function TickItem({
  id,
  label,
  checked,
  onToggle,
  onDelete,
}: {
  id: string;
  label: string;
  checked: boolean;
  /** Bound server action receiving the new state. */
  onToggle: (checked: boolean) => Promise<ActionState>;
  onDelete?: () => Promise<ActionState>;
}) {
  const [ticked, setTicked] = useOptimistic(checked);
  const { error, run } = useProgressAction();

  return (
    <li className="flex flex-col gap-1 py-1.5">
      <div className="flex items-center gap-3">
        <Checkbox
          inputId={id}
          checked={ticked}
          onChange={() =>
            run(
              () => onToggle(!ticked),
              () => setTicked(!ticked),
            )
          }
        />
        <label
          htmlFor={id}
          className={`flex-1 ${ticked ? "text-muted line-through" : ""}`}
        >
          {label}
        </label>
        {onDelete && (
          <Button
            type="button"
            variant="secondary"
            icon="pi pi-times"
            text
            aria-label={`${de.common.delete}: ${label}`}
            onClick={() => run(onDelete)}
          />
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-500">
          {error}
        </p>
      )}
    </li>
  );
}
