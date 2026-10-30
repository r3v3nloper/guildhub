"use client";

import { SelectField, type SelectOption } from "@/components/ui/SelectField";
import { Button, Field, FormMessage, TextInput } from "@/components/ui/ui";
import { useFormAction } from "@/components/ui/use-form-action";
import type { ActionState } from "@/lib/actions/action-state";
import { de } from "@/i18n/de";

/**
 * Officers add a recommended build: for a fixed spec (from that spec's card), or with
 * the spec to pick.
 */
export function SpecBuildForm({
  action,
  specs,
  fixedSpec,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  specs: SelectOption[];
  /** The spec's key, when the form belongs to one spec. */
  fixedSpec?: string;
}) {
  const { state, pending, formRef, onSubmit } = useFormAction(action, {
    resetOnSuccess: true,
  });
  const errors = state.errors ?? {};

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-3">
      {fixedSpec ? (
        <input type="hidden" name="spec" value={fixedSpec} />
      ) : (
        <Field label={de.specBuilds.spec} error={errors.specKey}>
          <SelectField
            name="spec"
            placeholder={de.common.choose}
            options={specs}
          />
        </Field>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label={de.specBuilds.buildTitle}
          error={errors.title}
          hint={de.specBuilds.titleHint}
        >
          <TextInput name="title" required maxLength={60} />
        </Field>
        <Field label={de.specBuilds.url} error={errors.url}>
          <TextInput name="url" type="url" required placeholder="https://…" />
        </Field>
      </div>
      <Field label={de.specBuilds.notes} error={errors.notes}>
        <TextInput name="notes" maxLength={300} />
      </Field>
      <div className="flex items-center gap-3">
        <Button disabled={pending}>{de.specBuilds.add}</Button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
