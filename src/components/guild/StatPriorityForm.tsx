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
import { StatsEditor } from "./StatsEditor";

export interface StatPriorityFormValues {
  title: string;
  stats: string[];
  notes: string;
  source: string;
}

export function StatPriorityForm({
  action,
  values,
  suggestions,
  cancelHref,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  values: StatPriorityFormValues;
  /** Stats the game's other rankings use. */
  suggestions: string[];
  cancelHref: string;
}) {
  const { state, pending, onSubmit } = useFormAction(action);
  const errors = state.errors ?? {};

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-5 rounded-[22px] border border-border bg-surface p-5 md:p-6"
    >
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
        <StatsEditor
          name="stats"
          defaultValue={values.stats}
          suggestions={suggestions}
        />
      </Field>
      <Field label={de.statPriorities.notes} error={errors.notes}>
        <TextArea name="notes" defaultValue={values.notes} maxLength={500} />
      </Field>
      <Field label={de.statPriorities.source} error={errors.source}>
        <TextInput
          name="source"
          type="url"
          defaultValue={values.source}
          placeholder="https://…"
        />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={pending}>{de.common.save}</Button>
        <a
          href={cancelHref}
          className="flex min-h-10 items-center rounded-xl px-3 text-sm font-semibold text-soft hover:bg-raised hover:text-white"
        >
          {de.common.cancel}
        </a>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
