"use client";

import { useEffect, useState } from "react";
import { Button, Field, FormMessage, TextInput } from "@/components/ui/ui";
import { SelectField } from "@/components/ui/SelectField";
import { useFormAction } from "@/components/ui/use-form-action";
import type { ActionState } from "@/lib/actions/action-state";
import type { BuildStatus } from "@/lib/db/schema";
import type { CatalogOption } from "@/lib/roster/form-options";
import { de } from "@/i18n/de";

export interface BuildFormValues {
  title: string;
  url: string;
  status: BuildStatus;
  targetClassKey: string;
  notes: string;
}

const EMPTY_BUILD: BuildFormValues = {
  title: "",
  url: "",
  status: "current",
  targetClassKey: "",
  notes: "",
};

/**
 * Adds a build when `values` is omitted (and clears itself afterwards), or edits the
 * given build and reports success through `onSaved`.
 */
export function BuildForm({
  action,
  classes,
  values,
  onSaved,
  onCancel,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  classes: CatalogOption[];
  values?: BuildFormValues;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const editing = values !== undefined;
  const initial = values ?? EMPTY_BUILD;
  const { state, pending, formRef, onSubmit } = useFormAction(action, {
    resetOnSuccess: !editing,
  });
  const [status, setStatus] = useState<string>(initial.status);
  const errors = state.errors ?? {};

  useEffect(() => {
    if (state.ok) {
      onSaved?.();
    }
  }, [state, onSaved]);

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      onReset={() => setStatus(initial.status)}
      className="grid gap-3 sm:grid-cols-2"
    >
      <Field label={de.characters.buildUrl} error={errors.url}>
        <TextInput
          name="url"
          type="url"
          placeholder="https://…"
          defaultValue={initial.url}
        />
      </Field>
      <Field label={de.characters.buildTitle} error={errors.title}>
        <TextInput name="title" defaultValue={initial.title} />
      </Field>
      <Field label={de.characters.buildStatus}>
        <SelectField
          name="status"
          value={status}
          onChange={setStatus}
          options={[
            { value: "current", label: de.characters.buildCurrent },
            { value: "planned", label: de.characters.buildPlanned },
          ]}
        />
      </Field>
      {status === "planned" && classes.length > 0 && (
        <Field
          label={de.characters.buildTargetClass}
          error={errors.targetClassKey}
        >
          <SelectField
            name="targetClass"
            defaultValue={initial.targetClassKey}
            emptyLabel={de.common.none}
            options={classes.map((option) => ({
              value: option.key,
              label: option.label,
            }))}
          />
        </Field>
      )}
      <Field label={de.characters.buildNotes}>
        <TextInput name="notes" defaultValue={initial.notes} />
      </Field>
      <div className="flex items-end gap-3">
        <Button disabled={pending}>
          {editing ? de.characters.saveBuild : de.characters.addBuild}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="secondary"
            text
            label={de.common.cancel}
            onClick={onCancel}
          />
        )}
        <FormMessage state={state} />
      </div>
    </form>
  );
}
