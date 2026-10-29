"use client";

import {
  Button,
  Field,
  FormMessage,
  TextArea,
  TextInput,
} from "@/components/ui/ui";
import { useEffect } from "react";
import { useFormAction } from "@/components/ui/use-form-action";
import type { ActionState } from "@/lib/actions/action-state";
import { de } from "@/i18n/de";

export interface BossFormValues {
  name: string;
  mechanics: string;
  loot: string;
}

/**
 * Name, mechanics and loot of one boss; a new boss form clears after saving. New bosses
 * start with the name only, the rest is filled in at the boss itself.
 */
export function BossForm({
  action,
  values,
  isNew,
  onDone,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  values: BossFormValues;
  isNew: boolean;
  /** Closes the form: after saving, and from its cancel button. */
  onDone?: () => void;
}) {
  const { state, pending, formRef, onSubmit } = useFormAction(action, {
    resetOnSuccess: isNew,
  });
  const errors = state.errors ?? {};

  useEffect(() => {
    if (state.ok) {
      onDone?.();
    }
    // onDone is a fresh closure per render; only a new result should trigger it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

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
      {isNew ? (
        <>
          <input type="hidden" name="mechanics" value="" />
          <input type="hidden" name="loot" value="" />
          <p className="text-sm text-muted">{de.checklists.newBossHint}</p>
        </>
      ) : (
        <>
          <Field
            label={de.checklists.mechanics}
            error={errors.mechanics}
            hint={de.checklists.mechanicsHint}
          >
            <TextArea
              name="mechanics"
              defaultValue={values.mechanics}
              rows={4}
            />
          </Field>
          <Field
            label={de.checklists.loot}
            error={errors.loot}
            hint={de.checklists.lootHint}
          >
            <TextArea name="loot" defaultValue={values.loot} rows={3} />
          </Field>
        </>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          disabled={pending}
          icon={isNew ? "pi pi-plus" : "pi pi-check"}
          label={isNew ? de.checklists.addBoss : de.common.save}
        />
        {onDone && (
          <Button
            type="button"
            variant="secondary"
            label={de.common.cancel}
            onClick={onDone}
          />
        )}
        {!state.ok && <FormMessage state={state} />}
      </div>
    </form>
  );
}
