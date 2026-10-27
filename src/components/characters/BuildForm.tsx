"use client";

import { useActionState, useState } from "react";
import {
  Button,
  Field,
  FormMessage,
  Select,
  TextInput,
} from "@/components/ui/ui";
import type { ActionState } from "@/lib/actions/action-state";
import type { CatalogOption } from "@/lib/roster/form-options";
import { de } from "@/i18n/de";

export function BuildForm({
  action,
  classes,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  classes: CatalogOption[];
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [status, setStatus] = useState("current");
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2">
      <Field label={de.characters.buildUrl} error={errors.url}>
        <TextInput name="url" type="url" placeholder="https://…" />
      </Field>
      <Field label={de.characters.buildTitle} error={errors.title}>
        <TextInput name="title" />
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
          <Select name="targetClass" defaultValue="">
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
        <TextInput name="notes" />
      </Field>
      <div className="flex items-end gap-3">
        <Button disabled={pending}>{de.characters.addBuild}</Button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
