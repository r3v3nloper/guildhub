"use client";

import { confirmPopup } from "primereact/confirmpopup";
import { useRouter } from "next/navigation";
import { Menu } from "primereact/menu";
import type { MenuItem } from "primereact/menuitem";
import { useRef } from "react";
import { useOptimisticAction } from "@/components/ui/use-optimistic-action";
import type { ActionState } from "@/lib/actions/action-state";
import { de } from "@/i18n/de";

/**
 * A "⋯" menu with delete (and edit, where it has a page): rare actions stay out of the
 * row (requests, builds, farm spots).
 */
export function RequestMenu({
  label,
  onDelete,
  question = de.requests.deleteConfirm,
  editHref,
}: {
  /** Accessible name, e.g. "Weitere Aktionen für Dunkle Lederstiefel". */
  label: string;
  onDelete: () => Promise<ActionState>;
  /** Confirmation before deleting. */
  question?: string;
  /** Page for editing; without it the menu only deletes. */
  editHref?: string;
}) {
  const menu = useRef<Menu>(null);
  const button = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const { pending, error, run } = useOptimisticAction();
  const edit: MenuItem[] = editHref
    ? [
        {
          label: de.common.edit,
          icon: "pi pi-pencil",
          command: () => router.push(editHref),
        },
      ]
    : [];

  return (
    <span className="flex flex-col items-end">
      <Menu
        ref={menu}
        popup
        popupAlignment="right"
        model={[
          ...edit,
          {
            label: de.common.delete,
            icon: "pi pi-trash",
            command: () =>
              confirmPopup({
                target: button.current ?? undefined,
                message: question,
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
