"use client";

import { Checkbox } from "primereact/checkbox";
import { useOptimistic } from "react";
import { useOptimisticAction } from "@/components/ui/use-optimistic-action";
import type { ActionState } from "@/lib/actions/action-state";
import { de } from "@/i18n/de";

/** A checkbox row that ticks optimistically; to-do entries and checklist points. */
export function TickItem({
  id,
  label,
  checked,
  onToggle,
  onDelete,
  meta,
}: {
  id: string;
  label: string;
  checked: boolean;
  /** Bound server action receiving the new state. */
  onToggle: (checked: boolean) => Promise<ActionState>;
  onDelete?: () => Promise<ActionState>;
  /** Small note after the label, e.g. who ticked a shared entry. */
  meta?: string;
}) {
  const [ticked, setTicked] = useOptimistic(checked);
  const { error, run } = useOptimisticAction();

  return (
    <li className="flex flex-col gap-1">
      <div className="flex min-h-11 items-center gap-3 rounded-xl px-2.5 transition-colors hover:bg-raised">
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
          className={`flex-1 cursor-pointer py-2.5 text-[14.5px] leading-snug ${ticked ? "text-muted line-through" : ""}`}
        >
          {label}
        </label>
        {meta && <span className="text-xs text-muted">{meta}</span>}
        {onDelete && (
          <button
            type="button"
            aria-label={`${de.common.delete}: ${label}`}
            title={de.common.delete}
            onClick={() => run(onDelete)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[#8f88aa] hover:bg-raised hover:text-danger"
          >
            <i className="pi pi-times text-xs" aria-hidden />
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="px-2.5 text-sm text-danger">
          {error}
        </p>
      )}
    </li>
  );
}
