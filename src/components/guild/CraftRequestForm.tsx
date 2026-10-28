"use client";

import { useState } from "react";
import { SelectField, type SelectOption } from "@/components/ui/SelectField";
import { Button, Field, FormMessage, TextInput } from "@/components/ui/ui";
import { useFormAction } from "@/components/ui/use-form-action";
import type { ActionState } from "@/lib/actions/action-state";
import { de } from "@/i18n/de";

export interface CraftRequestGame extends SelectOption {
  professions: SelectOption[];
}

/** New crafting request: the profession list follows the chosen game. */
export function CraftRequestForm({
  action,
  games,
  defaultGame,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  games: CraftRequestGame[];
  defaultGame: string;
}) {
  const { state, pending, formRef, onSubmit } = useFormAction(action, {
    resetOnSuccess: true,
  });
  const [gameId, setGameId] = useState(defaultGame);
  const [profession, setProfession] = useState("");
  const errors = state.errors ?? {};
  const professions =
    games.find((game) => game.value === gameId)?.professions ?? [];

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {games.length > 1 && (
          <Field label={de.tasks.fieldGame} error={errors.gameId}>
            <SelectField
              name="game"
              value={gameId}
              onChange={(next) => {
                setGameId(next);
                setProfession("");
              }}
              options={games}
            />
          </Field>
        )}
        {games.length === 1 && (
          <input type="hidden" name="game" value={gameId} />
        )}
        <Field label={de.farmSpots.profession} error={errors.professionKey}>
          <SelectField
            name="profession"
            value={profession}
            onChange={setProfession}
            placeholder={de.common.choose}
            options={professions}
          />
        </Field>
        <Field label={de.requests.item} error={errors.item}>
          <TextInput name="item" required maxLength={100} />
        </Field>
        <Field label={de.requests.quantity} error={errors.quantity}>
          <TextInput
            name="quantity"
            type="number"
            min={1}
            max={1000}
            defaultValue="1"
          />
        </Field>
      </div>
      <Field label={de.requests.notes} error={errors.notes}>
        <TextInput name="notes" maxLength={300} />
      </Field>
      <div className="flex items-center gap-3">
        <Button
          disabled={pending}
          icon="pi pi-send"
          label={de.requests.submit}
        />
        <FormMessage state={state} />
      </div>
    </form>
  );
}
