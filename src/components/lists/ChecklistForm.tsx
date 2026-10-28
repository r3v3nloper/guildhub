"use client";

import { SelectField, type SelectOption } from "@/components/ui/SelectField";
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
import { VisibilityField } from "./VisibilityField";

export interface ChecklistFormValues {
  name: string;
  game: string;
  visibility: string;
  items: string;
}

export function ChecklistForm({
  action,
  games,
  values,
  isNew,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  games: SelectOption[];
  values: ChecklistFormValues;
  isNew: boolean;
}) {
  const { state, pending, onSubmit } = useFormAction(action);
  const errors = state.errors ?? {};

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={de.checklists.name} error={errors.name}>
          <TextInput
            name="name"
            defaultValue={values.name}
            required
            maxLength={60}
          />
        </Field>
        <Field label={de.tasks.fieldGame} error={errors.gameId}>
          <SelectField
            name="game"
            defaultValue={values.game}
            options={games}
            disabled={!isNew}
          />
        </Field>
        <Field label={de.visibility.label} error={errors.visibility}>
          <VisibilityField defaultValue={values.visibility} />
        </Field>
      </div>
      <Field
        label={de.checklists.items}
        error={errors.items}
        hint={isNew ? undefined : de.checklists.itemsHint}
      >
        <TextArea name="items" defaultValue={values.items} rows={8} />
      </Field>
      <div className="flex items-center gap-3">
        <Button disabled={pending}>{de.common.save}</Button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
