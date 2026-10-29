"use client";

import { useState } from "react";
import { SelectField, type SelectOption } from "@/components/ui/SelectField";
import { Button, Field, FormMessage, TextInput } from "@/components/ui/ui";
import { useFormAction } from "@/components/ui/use-form-action";
import type { ActionState } from "@/lib/actions/action-state";
import { de } from "@/i18n/de";

export interface CraftRequestProfession extends SelectOption {
  /** Recipes the request must choose from; absent means free text (materials). */
  recipes?: Array<SelectOption & { reagents: string | null }>;
}

export interface CraftRequestGame extends SelectOption {
  professions: CraftRequestProfession[];
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
  const [gameId, setGameId] = useState(defaultGame);
  const [profession, setProfession] = useState("");
  const [recipe, setRecipe] = useState("");
  const { state, pending, formRef, onSubmit } = useFormAction(action, {
    resetOnSuccess: true,
    onSuccess: () => {
      setProfession("");
      setRecipe("");
    },
  });
  const errors = state.errors ?? {};
  const professions =
    games.find((game) => game.value === gameId)?.professions ?? [];
  const recipes = professions.find((p) => p.value === profession)?.recipes;
  const reagents = recipes?.find((r) => r.value === recipe)?.reagents;
  const chooseProfession = (next: string) => {
    setProfession(next);
    setRecipe("");
  };

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
                chooseProfession("");
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
            onChange={chooseProfession}
            placeholder={de.common.choose}
            options={professions}
          />
        </Field>
        {/* Recipe names are long; the wider field keeps them readable. */}
        <div className="lg:col-span-2">
          <Field label={de.requests.item} error={errors.item}>
            {recipes ? (
              <SelectField
                name="item"
                value={recipe}
                onChange={setRecipe}
                placeholder={de.requests.chooseRecipe}
                options={recipes}
              />
            ) : (
              <TextInput
                name="item"
                required
                maxLength={100}
                placeholder={profession ? de.requests.itemFreeText : undefined}
              />
            )}
          </Field>
        </div>
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
      {reagents && (
        <p className="-mt-1 text-sm text-muted italic">
          {de.requests.reagents}: {reagents}
        </p>
      )}
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
