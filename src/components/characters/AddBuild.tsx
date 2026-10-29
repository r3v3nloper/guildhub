"use client";

import { useCallback, useState } from "react";
import type { ActionState } from "@/lib/actions/action-state";
import type { CatalogOption } from "@/lib/roster/form-options";
import { de } from "@/i18n/de";
import { BuildForm } from "./BuildForm";

/** "+ Build hinzufügen": the form only opens when needed. */
export function AddBuild({
  action,
  classes,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  classes: CatalogOption[];
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-13 items-center justify-center gap-2 rounded-[18px] border border-dashed border-[#3a3358] text-sm font-bold text-accent-strong hover:bg-surface"
      >
        <i className="pi pi-plus text-xs" aria-hidden />
        {de.characters.addBuildOpen}
      </button>
    );
  }
  return (
    <div className="rounded-[20px] border border-[#2c2645] bg-surface p-5">
      <BuildForm
        action={action}
        classes={classes}
        onSaved={close}
        onCancel={close}
      />
    </div>
  );
}
