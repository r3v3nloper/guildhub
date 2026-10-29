"use client";

import { useState } from "react";
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
  notes: string;
}

/** A pack dungeon or raid a new page can start from. */
export interface InstanceOption extends SelectOption {
  name: string;
  bosses: string[];
}

export function ChecklistForm({
  action,
  games,
  instancesByGame = {},
  values,
  isNew,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  games: SelectOption[];
  /** New pages only: templates per game id. */
  instancesByGame?: Record<string, InstanceOption[]>;
  values: ChecklistFormValues;
  isNew: boolean;
}) {
  const { state, pending, onSubmit } = useFormAction(action);
  const errors = state.errors ?? {};
  const [game, setGame] = useState(values.game);
  const [instance, setInstance] = useState("");
  const [name, setName] = useState(values.name);
  const [items, setItems] = useState(values.items);
  const instances = isNew ? (instancesByGame[game] ?? []) : [];

  // Fills only what is still empty, so nothing typed gets overwritten.
  const chooseInstance = (key: string) => {
    setInstance(key);
    const template = instances.find((option) => option.value === key);
    if (!template) {
      return;
    }
    if (!name.trim()) {
      setName(template.name);
    }
    if (!items.trim()) {
      setItems(template.bosses.join("\n"));
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={de.tasks.fieldGame} error={errors.gameId}>
          <SelectField
            name="game"
            value={game}
            onChange={(next) => {
              setGame(next);
              setInstance("");
            }}
            options={games}
            disabled={!isNew}
          />
        </Field>
        {instances.length > 0 && (
          <div className="sm:col-span-2">
            <Field
              label={de.checklists.instance}
              error={errors.instanceKey}
              hint={de.checklists.instanceHint}
            >
              <SelectField
                name="instance"
                value={instance}
                emptyLabel={de.checklists.instanceNone}
                options={instances}
                onChange={chooseInstance}
              />
            </Field>
          </div>
        )}
        <Field label={de.checklists.name} error={errors.name}>
          <TextInput
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            maxLength={60}
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
        <TextArea
          name="items"
          value={items}
          onChange={(event) => setItems(event.target.value)}
          rows={8}
        />
      </Field>
      <Field
        label={de.checklists.notes}
        error={errors.notes}
        hint={de.checklists.notesHint}
      >
        <TextArea name="notes" defaultValue={values.notes} rows={5} />
      </Field>
      <div className="flex items-center gap-3">
        <Button disabled={pending}>{de.common.save}</Button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
