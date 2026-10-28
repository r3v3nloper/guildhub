"use client";

import {
  Button,
  Field,
  FormMessage,
  TextArea,
  TextInput,
} from "@/components/ui/ui";
import { useFormAction } from "@/components/ui/use-form-action";
import type { ActionState } from "@/lib/actions/action-state";
import { de } from "@/i18n/de";

export interface StatPriorityFormValues {
  title: string;
  stats: string;
  notes: string;
  source: string;
}

export function StatPriorityForm({
  action,
  values,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  values: StatPriorityFormValues;
}) {
  const { state, pending, onSubmit } = useFormAction(action);
  const errors = state.errors ?? {};

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field
        label={de.statPriorities.variant}
        error={errors.title}
        hint={de.statPriorities.variantHint}
      >
        <TextInput
          name="title"
          defaultValue={values.title}
          required
          maxLength={40}
        />
      </Field>
      <Field
        label={de.statPriorities.stats}
        error={errors.stats}
        hint={de.statPriorities.statsHint}
      >
        <TextArea name="stats" defaultValue={values.stats} rows={6} />
      </Field>
      <Field label={de.statPriorities.notes} error={errors.notes}>
        <TextArea name="notes" defaultValue={values.notes} maxLength={500} />
      </Field>
      <Field label={de.statPriorities.source} error={errors.source}>
        <TextInput name="source" type="url" defaultValue={values.source} />
      </Field>
      <div className="flex items-center gap-3">
        <Button disabled={pending}>{de.common.save}</Button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
