"use client";

import { confirmPopup } from "primereact/confirmpopup";
import { Menu } from "primereact/menu";
import { useRef } from "react";
import { useOptimisticAction } from "@/components/ui/use-optimistic-action";
import type { ActionState } from "@/lib/actions/action-state";
import { de } from "@/i18n/de";

/** The "⋯" of a request: rare actions such as deleting stay out of the row. */
export function RequestMenu({
  label,
  onDelete,
}: {
  /** Accessible name, e.g. "Weitere Aktionen für Dunkle Lederstiefel". */
  label: string;
  onDelete: () => Promise<ActionState>;
}) {
  const menu = useRef<Menu>(null);
  const button = useRef<HTMLButtonElement>(null);
  const { pending, error, run } = useOptimisticAction();

  return (
    <span className="flex flex-col items-end">
      <Menu
        ref={menu}
        popup
        popupAlignment="right"
        model={[
          {
            label: de.common.delete,
            icon: "pi pi-trash",
            command: () =>
              confirmPopup({
                target: button.current ?? undefined,
                message: de.requests.deleteConfirm,
                icon: "pi pi-exclamation-triangle",
                acceptClassName: "p-button-danger",
                accept: () => run(onDelete),
              }),
          },
        ]}
      />
      <button
        ref={button}
        type="button"
        aria-label={label}
        aria-haspopup
        aria-busy={pending}
        onClick={(event) => menu.current?.toggle(event)}
        className="flex h-11 w-11 items-center justify-center rounded-xl text-muted hover:bg-raised hover:text-foreground"
      >
        <i className="pi pi-ellipsis-h" aria-hidden />
      </button>
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </span>
  );
}
