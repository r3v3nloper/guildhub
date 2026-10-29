"use client";

import { useMemo, useState, type ReactNode } from "react";
import { SelectField } from "@/components/ui/SelectField";
import { Button, Field, FormMessage, TextInput } from "@/components/ui/ui";
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

const SKILL_STEP = 5;
const NOTE_SEPARATOR = " – ";

/** Recipe lines as stored ("Name – Notiz"), split for the chips. */
function recipeLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * One profession of a character as a card: skill with −/+, specialisation and a note
 * up front; rare recipes folded away, since the skill already covers trainer recipes.
 */
export function ProfessionDetailsForm({
  entryId,
  label,
  gathering,
  values,
  recipeOptions,
  action,
  defaultOpen = false,
  removeControl,
}: {
  /** The profession's catalog entry; keeps element IDs unique on the page. */
  entryId: number;
  label: string;
  /** Gathering professions have no recipes to enter. */
  gathering: boolean;
  values: ProfessionDetailsValues;
  /** Pack recipes of this profession; empty when the pack lists none. */
  recipeOptions: RecipeOption[];
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  defaultOpen?: boolean;
  /** "Beruf entfernen": its own form, so it sits outside this one. */
  removeControl: ReactNode;
}) {
  const { state, pending, onSubmit } = useFormAction(action);
  const errors = state.errors ?? {};
  const [open, setOpen] = useState(defaultOpen);
  const [skill, setSkill] = useState(values.skillLevel?.toString() ?? "");
  const [specialization, setSpecialization] = useState(
    values.specialization ?? "",
  );
  const [recipes, setRecipes] = useState(() => recipeLines(values.recipes));
  const [freeRecipe, setFreeRecipe] = useState("");
  const skillNumber = skill.trim() === "" ? null : Number(skill);
  const learnable = useMemo(
    () =>
      learnableAt(recipeOptions, skillNumber).filter(
        (option) =>
          !recipes.some(
            (line) => line.split(NOTE_SEPARATOR)[0] === option.value,
          ),
      ),
    [recipeOptions, skillNumber, recipes],
  );

  const addRecipe = (line: string) => {
    const trimmed = line.trim();
    if (trimmed && !recipes.includes(trimmed)) {
      setRecipes([...recipes, trimmed]);
    }
  };
  const changeSkill = (delta: number) =>
    setSkill(String(Math.max(0, (skillNumber ?? 0) + delta)));
  const bodyId = `profession-${entryId}`;
  const summary = gathering
    ? de.characters.gatheringSummary
    : de.characters.professionSummary(
        values.specialization,
        recipeLines(values.recipes).length,
      );

  return (
    <section className="rounded-[22px] border border-border bg-surface">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={bodyId}
        className="flex min-h-18 w-full flex-wrap items-center gap-x-5 gap-y-1 rounded-[22px] px-5 py-3.5 text-left hover:bg-[#1a1630]"
      >
        <span className="flex min-w-0 flex-[1_1_200px] flex-col gap-0.5">
          <span className="text-[17px] font-bold text-white">{label}</span>
          <span className="text-[12.5px] text-muted">{summary}</span>
        </span>
        <span className="text-[15px] font-bold tabular-nums">
          {values.skillLevel ?? (
            <span className="text-sm font-semibold text-muted">
              {de.characters.skillUnknown}
            </span>
          )}
        </span>
        <i
          className={`pi pi-chevron-down text-sm text-muted transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {open && (
        <div
          id={bodyId}
          className="flex flex-col gap-4 border-t border-border px-5 pt-4 pb-5"
        >
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="grid gap-3.5 sm:grid-cols-3">
              <div className="flex flex-col gap-1 text-sm">
                <span id={`${bodyId}-skill`} className="font-medium">
                  {de.characters.skillLevel}
                </span>
                <div
                  role="group"
                  aria-labelledby={`${bodyId}-skill`}
                  className="flex items-center gap-1.5"
                >
                  <Button
                    type="button"
                    variant="secondary"
                    icon="pi pi-minus"
                    aria-label={de.characters.skillDown}
                    onClick={() => changeSkill(-SKILL_STEP)}
                  />
                  <TextInput
                    name="skillLevel"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={skill}
                    aria-labelledby={`${bodyId}-skill`}
                    onChange={(event) => setSkill(event.target.value)}
                    className="max-w-22 text-center"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    icon="pi pi-plus"
                    aria-label={de.characters.skillUp}
                    onClick={() => changeSkill(SKILL_STEP)}
                  />
                </div>
                {errors.skillLevel && (
                  <small className="text-danger">{errors.skillLevel}</small>
                )}
              </div>
              <Field
                label={de.characters.specialization}
                error={errors.specialization}
              >
                <TextInput
                  name="specialization"
                  maxLength={200}
                  value={specialization}
                  placeholder={de.characters.specializationPlaceholder}
                  onChange={(event) => setSpecialization(event.target.value)}
                />
              </Field>
              <Field label={de.characters.professionNotes} error={errors.notes}>
                <TextInput
                  name="notes"
                  maxLength={200}
                  defaultValue={values.notes ?? ""}
                  placeholder={de.characters.professionNotePlaceholder}
                />
              </Field>
            </div>

            {gathering ? (
              <p className="text-[13px] text-muted">
                {de.characters.gatheringNoRecipes}
              </p>
            ) : (
              <details
                open={recipes.length > 0}
                className="group rounded-2xl border border-[#2c2645] px-4"
              >
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
                  <span className="flex items-baseline gap-2">
                    <span className="text-sm font-bold">
                      {de.characters.rareRecipes}
                    </span>
                    <span className="text-xs text-muted">
                      {recipes.length > 0
                        ? recipes.length
                        : de.characters.optional}
                    </span>
                  </span>
                  <i
                    className="pi pi-chevron-down text-xs text-muted transition-transform group-open:rotate-180"
                    aria-hidden
                  />
                </summary>
                <div className="flex flex-col gap-3 pb-4">
                  <p className="text-[12.5px] text-muted">
                    {de.characters.rareRecipesHint}
                  </p>
                  {recipes.length > 0 && (
                    <ul className="flex flex-wrap gap-1.5">
                      {recipes.map((line) => {
                        const [name, ...note] = line.split(NOTE_SEPARATOR);
                        return (
                          <li
                            key={line}
                            className="flex items-center gap-1 rounded-xl border border-[#2c2645] bg-raised py-1 pr-1 pl-3 text-[13.5px]"
                          >
                            <span className="min-w-0">
                              <span className="font-semibold">{name}</span>
                              {note.length > 0 && (
                                <span className="text-muted">
                                  {" "}
                                  · {note.join(NOTE_SEPARATOR)}
                                </span>
                              )}
                            </span>
                            <button
                              type="button"
                              aria-label={de.characters.removeRecipe(name)}
                              onClick={() =>
                                setRecipes(recipes.filter((r) => r !== line))
                              }
                              className="flex h-7.5 w-7.5 items-center justify-center rounded-lg text-muted hover:bg-chip hover:text-foreground"
                            >
                              <i className="pi pi-times text-xs" aria-hidden />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <div className="grid gap-2 sm:grid-cols-2">
                    {recipeOptions.length > 0 && (
                      <SelectField
                        name="recipePicker"
                        value=""
                        placeholder={de.characters.rareRecipePick}
                        aria-label={de.characters.rareRecipePick}
                        options={learnable}
                        onChange={addRecipe}
                      />
                    )}
                    <TextInput
                      value={freeRecipe}
                      aria-label={de.characters.rareRecipeFree}
                      placeholder={de.characters.rareRecipeFree}
                      onChange={(event) => setFreeRecipe(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addRecipe(freeRecipe);
                          setFreeRecipe("");
                        }
                      }}
                    />
                  </div>
                  {errors.recipes && (
                    <small className="text-danger">{errors.recipes}</small>
                  )}
                </div>
              </details>
            )}
            <input type="hidden" name="recipes" value={recipes.join("\n")} />

            <div className="flex flex-wrap items-center gap-3">
              <Button disabled={pending} label={de.common.save} />
              <FormMessage state={state} />
            </div>
          </form>
          <div className="flex justify-end">{removeControl}</div>
        </div>
      )}
    </section>
  );
}
