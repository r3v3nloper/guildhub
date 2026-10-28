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

export interface FarmSpotFormGame extends SelectOption {
  professions: SelectOption[];
}

export interface FarmSpotFormValues {
  game: string;
  profession: string;
  resource: string;
  zone: string;
  coordinates: string;
  link: string;
  notes: string;
  visibility: string;
}

export function FarmSpotForm({
  action,
  games,
  values,
  isNew,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  games: FarmSpotFormGame[];
  values: FarmSpotFormValues;
  isNew: boolean;
}) {
  const { state, pending, onSubmit } = useFormAction(action);
  const [gameId, setGameId] = useState(values.game);
  const [profession, setProfession] = useState(values.profession);
  const errors = state.errors ?? {};
  const professions =
    games.find((game) => game.value === gameId)?.professions ?? [];

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={de.tasks.fieldGame} error={errors.gameId}>
          <SelectField
            name="game"
            value={gameId}
            onChange={(next) => {
              setGameId(next);
              setProfession("");
            }}
            options={games}
            disabled={!isNew}
          />
        </Field>
        {professions.length > 0 && (
          <Field label={de.farmSpots.profession} error={errors.professionKey}>
            <SelectField
              name="profession"
              value={profession}
              onChange={setProfession}
              emptyLabel={de.common.none}
              options={professions}
            />
          </Field>
        )}
        <Field label={de.visibility.label} error={errors.visibility}>
          <VisibilityField defaultValue={values.visibility} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={de.farmSpots.resource} error={errors.resource}>
          <TextInput
            name="resource"
            defaultValue={values.resource}
            required
            maxLength={60}
          />
        </Field>
        <Field label={de.farmSpots.zone} error={errors.zone}>
          <TextInput
            name="zone"
            defaultValue={values.zone}
            required
            maxLength={60}
          />
        </Field>
        <Field label={de.farmSpots.coordinates} error={errors.coordinates}>
          <TextInput
            name="coordinates"
            defaultValue={values.coordinates}
            maxLength={40}
          />
        </Field>
      </div>
      <Field label={de.farmSpots.link} error={errors.link}>
        <TextInput name="link" type="url" defaultValue={values.link} />
      </Field>
      <Field label={de.farmSpots.notes} error={errors.notes}>
        <TextArea name="notes" defaultValue={values.notes} maxLength={500} />
      </Field>
      <div className="flex items-center gap-3">
        <Button disabled={pending}>{de.common.save}</Button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
