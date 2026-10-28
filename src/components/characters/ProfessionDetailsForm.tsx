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

export interface ProfessionDetailsValues {
  skillLevel: number | null;
  specialization: string | null;
  notes: string | null;
  recipes: string;
}

/** Skill, specialisation, a note and the recipes for one profession the character has. */
export function ProfessionDetailsForm({
  label,
  values,
  action,
}: {
  label: string;
  values: ProfessionDetailsValues;
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const { state, pending, onSubmit } = useFormAction(action);
  const errors = state.errors ?? {};

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 py-3">
      <span className="font-medium">{label}</span>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={de.characters.skillLevel} error={errors.skillLevel}>
          <TextInput
            name="skillLevel"
            type="number"
            min={0}
            defaultValue={values.skillLevel ?? ""}
          />
        </Field>
        <Field
          label={de.characters.specialization}
          error={errors.specialization}
        >
          <TextInput
            name="specialization"
            maxLength={200}
            defaultValue={values.specialization ?? ""}
          />
        </Field>
        <Field label={de.characters.professionNotes} error={errors.notes}>
          <TextInput
            name="notes"
            maxLength={200}
            defaultValue={values.notes ?? ""}
          />
        </Field>
      </div>
      <Field
        label={de.characters.recipes}
        error={errors.recipes}
        hint={de.characters.recipesHint}
      >
        <TextArea name="recipes" defaultValue={values.recipes} rows={2} />
      </Field>
      <div className="flex items-center gap-3">
        <Button variant="secondary" disabled={pending}>
          {de.common.save}
        </Button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
