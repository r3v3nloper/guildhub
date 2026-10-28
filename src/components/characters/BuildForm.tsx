"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Field,
  FormMessage,
  Select,
  TextInput,
} from "@/components/ui/ui";
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
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  classes: CatalogOption[];
  values?: BuildFormValues;
  onSaved?: () => void;
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
        <Select
          name="status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="current">{de.characters.buildCurrent}</option>
          <option value="planned">{de.characters.buildPlanned}</option>
        </Select>
      </Field>
      {status === "planned" && classes.length > 0 && (
        <Field
          label={de.characters.buildTargetClass}
          error={errors.targetClassKey}
        >
          <Select name="targetClass" defaultValue={initial.targetClassKey}>
            <option value="">{de.common.none}</option>
            {classes.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field label={de.characters.buildNotes}>
        <TextInput name="notes" defaultValue={initial.notes} />
      </Field>
      <div className="flex items-end gap-3">
        <Button disabled={pending}>
          {editing ? de.characters.saveBuild : de.characters.addBuild}
        </Button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
