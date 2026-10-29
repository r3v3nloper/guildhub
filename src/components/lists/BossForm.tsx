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

export interface BossFormValues {
  name: string;
  mechanics: string;
  loot: string;
}

/** Name, mechanics and loot of one boss; a new boss form clears after saving. */
export function BossForm({
  action,
  values,
  isNew,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  values: BossFormValues;
  isNew: boolean;
}) {
  const { state, pending, formRef, onSubmit } = useFormAction(action, {
    resetOnSuccess: isNew,
  });
  const errors = state.errors ?? {};

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-3">
      <Field label={de.checklists.bossName} error={errors.name}>
        <TextInput
          name="name"
          defaultValue={values.name}
          required
          maxLength={60}
        />
      </Field>
      <Field
        label={de.checklists.mechanics}
        error={errors.mechanics}
        hint={de.checklists.mechanicsHint}
      >
        <TextArea name="mechanics" defaultValue={values.mechanics} rows={4} />
      </Field>
      <Field
        label={de.checklists.loot}
        error={errors.loot}
        hint={de.checklists.lootHint}
      >
        <TextArea name="loot" defaultValue={values.loot} rows={4} />
      </Field>
      <div className="flex items-center gap-3">
        <Button
          disabled={pending}
          icon={isNew ? "pi pi-plus" : "pi pi-check"}
          label={isNew ? de.checklists.addBoss : de.common.save}
        />
        <FormMessage state={state} />
      </div>
    </form>
  );
}
