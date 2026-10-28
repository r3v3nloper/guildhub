"use client";

import { useCallback, useState } from "react";
import { ActionForm } from "@/components/ui/ActionForm";
import { Badge, Button } from "@/components/ui/ui";
import type { ActionState } from "@/lib/actions/action-state";
import type { CatalogOption } from "@/lib/roster/form-options";
import { de } from "@/i18n/de";
import { BuildForm, type BuildFormValues } from "./BuildForm";

/** One build in the editor: shown as a line, switchable to an edit form. */
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
  deleteAction: (
    state: ActionState,
    formData: FormData,
  ) => Promise<ActionState>;
}) {
  const [editing, setEditing] = useState(false);
  const closeEditor = useCallback(() => setEditing(false), []);

  if (editing) {
    return (
      <li className="flex flex-col gap-2 py-3">
        <BuildForm
          action={saveAction}
          classes={classes}
          values={values}
          onSaved={closeEditor}
        />
        <div>
          <Button type="button" variant="secondary" onClick={closeEditor}>
            {de.common.cancel}
          </Button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center gap-2 py-2 text-sm">
      <Badge tone={values.status === "current" ? "accent" : "neutral"}>
        {values.status === "current"
          ? de.characters.buildCurrent
          : de.characters.buildPlanned}
      </Badge>
      {values.url ? (
        <a
          href={values.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent underline"
        >
          {values.title}
        </a>
      ) : (
        <span>{values.title}</span>
      )}
      {targetClassName && (
        <span className="text-zinc-500">→ {targetClassName}</span>
      )}
      {values.notes && <span className="text-zinc-500">{values.notes}</span>}
      <div className="ml-auto flex gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setEditing(true)}
        >
          {de.characters.editBuild}
        </Button>
        <ActionForm action={deleteAction}>
          <Button variant="secondary">{de.common.delete}</Button>
        </ActionForm>
      </div>
    </li>
  );
}
