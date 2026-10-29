"use client";

import { useCallback, useState } from "react";
import { RequestMenu } from "@/components/guild/RequestMenu";
import type { ActionState } from "@/lib/actions/action-state";
import type { CatalogOption } from "@/lib/roster/form-options";
import { de } from "@/i18n/de";
import { BuildForm, type BuildFormValues } from "./BuildForm";

/** One build as a card; editing opens the form in place, deleting sits behind "⋯". */
export function BuildItem({
  values,
  targetClassName,
  classes,
  saveAction,
  deleteAction,
}: {
  values: BuildFormValues;
  targetClassName: string | undefined;
  classes: CatalogOption[];
  saveAction: (state: ActionState, formData: FormData) => Promise<ActionState>;
  deleteAction: () => Promise<ActionState>;
}) {
  const [editing, setEditing] = useState(false);
  const closeEditor = useCallback(() => setEditing(false), []);
  const current = values.status === "current";

  if (editing) {
    return (
      <li className="rounded-[20px] border border-[#2c2645] bg-surface p-5">
        <BuildForm
          action={saveAction}
          classes={classes}
          values={values}
          onSaved={closeEditor}
          onCancel={closeEditor}
        />
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[20px] border border-border bg-surface px-4.5 py-3.5">
      <span
        className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${current ? "bg-success-soft text-success" : "bg-chip text-soft"}`}
      >
        {current ? de.characters.buildCurrent : de.characters.buildPlanned}
      </span>
      <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-0.5">
        {values.url ? (
          <a
            href={values.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-base font-bold text-accent-strong hover:text-white"
          >
            {values.title || values.url}
            <i className="pi pi-external-link text-[11px]" aria-hidden />
          </a>
        ) : (
          <span className="text-base font-bold text-white">{values.title}</span>
        )}
        <span className="text-[13px] text-muted">
          {[
            targetClassName && `→ ${targetClassName}`,
            values.notes,
            !values.url && de.characters.buildNoLink,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </div>
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label={`${values.title}: ${de.characters.editBuild}`}
        title={de.characters.editBuild}
        className="flex h-11 w-11 items-center justify-center rounded-xl text-muted hover:bg-raised hover:text-foreground"
      >
        <i className="pi pi-pencil text-sm" aria-hidden />
      </button>
      <RequestMenu
        label={de.characters.buildActions(values.title)}
        onDelete={deleteAction}
        question={de.characters.deleteBuildConfirm}
      />
    </li>
  );
}
