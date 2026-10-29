"use client";

import { useMemo, useState } from "react";
import { SelectField } from "@/components/ui/SelectField";
import {
  Button,
  Field,
  FormMessage,
  TextArea,
  TextInput,
} from "@/components/ui/ui";
import { useFormAction } from "@/components/ui/use-form-action";
import type { ActionState } from "@/lib/actions/action-state";
import type { RecipeOption } from "@/lib/roster/form-options";
import { learnableAt } from "@/lib/roster/recipe-skill";
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
  recipeOptions,
  action,
}: {
  label: string;
  values: ProfessionDetailsValues;
  /** Pack recipes of this profession; empty when the pack lists none. */
  recipeOptions: RecipeOption[];
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const { state, pending, onSubmit } = useFormAction(action);
  const errors = state.errors ?? {};
  const [recipes, setRecipes] = useState(values.recipes);
  const [skillLevel, setSkillLevel] = useState(
    values.skillLevel?.toString() ?? "",
  );
  const learnable = useMemo(
    () =>
      learnableAt(
        recipeOptions,
        skillLevel.trim() === "" ? null : Number(skillLevel),
      ),
    [recipeOptions, skillLevel],
  );

  const addRecipe = (name: string) => {
    if (!name) {
      return;
    }
    setRecipes((current) =>
      current.trim() ? `${current.trimEnd()}\n${name}` : name,
    );
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 py-3">
      <span className="font-medium">{label}</span>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={de.characters.skillLevel} error={errors.skillLevel}>
          <TextInput
            name="skillLevel"
            type="number"
            min={0}
            value={skillLevel}
            onChange={(event) => setSkillLevel(event.target.value)}
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
      {recipeOptions.length > 0 && (
        <SelectField
          name="recipePicker"
          value=""
          placeholder={de.characters.addRecipe}
          aria-label={de.characters.addRecipe}
          options={learnable}
          onChange={addRecipe}
        />
      )}
      <Field
        label={de.characters.recipes}
        error={errors.recipes}
        hint={de.characters.recipesHint}
      >
        <TextArea
          name="recipes"
          value={recipes}
          onChange={(event) => setRecipes(event.target.value)}
          rows={2}
        />
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
