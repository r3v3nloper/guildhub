"use client";

import { useRef, useState, useTransition } from "react";
import { SelectField, type SelectOption } from "@/components/ui/SelectField";
import { Button, Field, FormMessage, TextInput } from "@/components/ui/ui";
import { useFormAction } from "@/components/ui/use-form-action";
import type { ActionState } from "@/lib/actions/action-state";
import type { RequestRecipeChoice } from "@/lib/guild/craft-requests";
import { de } from "@/i18n/de";

export interface CraftRequestProfession extends SelectOption {
  /** Members who hold it, as "Name (Charakter, Fertigkeit)". */
  crafters: string[];
}

export interface CraftRequestGame extends SelectOption {
  professions: CraftRequestProfession[];
}

const MAX_QUANTITY = 1000;

/**
 * New crafting request: profession first (with who can craft it), then the recipe or
 * free text, the quantity, and a preview of the materials and crafters.
 */
export function CraftRequestForm({
  action,
  loadRecipes,
  games,
  defaultGame,
  onCreated,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  /** The recipes a request for the profession must name; null means free text. */
  loadRecipes: (
    gameId: string,
    professionKey: string,
  ) => Promise<RequestRecipeChoice[] | null>;
  games: CraftRequestGame[];
  defaultGame: string;
  onCreated?: () => void;
}) {
  const [gameId, setGameId] = useState(defaultGame);
  const [profession, setProfession] = useState("");
  const [recipe, setRecipe] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [recipes, setRecipes] = useState<RequestRecipeChoice[] | null>(null);
  const [loadingRecipes, startLoading] = useTransition();
  // Only the answer for the latest choice counts when the user switches quickly.
  const latestChoice = useRef("");
  const { state, pending, formRef, onSubmit } = useFormAction(action, {
    resetOnSuccess: true,
    onSuccess: () => {
      setProfession("");
      setRecipe("");
      setRecipes(null);
      setQuantity(1);
      latestChoice.current = "";
      onCreated?.();
    },
  });
  const errors = state.errors ?? {};
  const professions =
    games.find((game) => game.value === gameId)?.professions ?? [];
  const chosenProfession = professions.find(
    (entry) => entry.value === profession,
  );
  const chosenRecipe = recipes?.find((entry) => entry.value === recipe);
  const crafters = chosenRecipe
    ? chosenRecipe.crafters
    : (chosenProfession?.crafters ?? []);

  const chooseProfession = (next: string) => {
    setProfession(next);
    setRecipe("");
    setRecipes(null);
    latestChoice.current = next;
    if (!next) {
      return;
    }
    startLoading(async () => {
      const choices = await loadRecipes(gameId, next);
      if (latestChoice.current === next) {
        setRecipes(choices);
      }
    });
  };
  const changeQuantity = (next: number) =>
    setQuantity(Math.min(MAX_QUANTITY, Math.max(1, Math.round(next) || 1)));

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-5">
      {games.length > 1 ? (
        <div className="max-w-xs">
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
        </div>
      ) : (
        <input type="hidden" name="game" value={gameId} />
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="pb-2 text-sm font-bold text-soft">
          {de.requests.profession}
        </legend>
        <div className="flex flex-wrap gap-2">
          {professions.map((entry) => {
            const active = entry.value === profession;
            return (
              <button
                key={entry.value}
                type="button"
                aria-pressed={active}
                onClick={() => chooseProfession(active ? "" : entry.value)}
                className={`flex min-h-13 flex-col items-start justify-center rounded-2xl border px-3.5 py-1.5 text-left ${
                  active
                    ? "border-[#6e58c8] bg-accent-soft text-white"
                    : "border-[#2c2645] bg-raised text-foreground hover:border-[#3a3358]"
                }`}
              >
                <span className="text-sm font-bold">{entry.label}</span>
                <span
                  className={`text-xs ${entry.crafters.length === 0 ? "text-warning" : "text-muted"}`}
                >
                  {de.requests.crafterCount(entry.crafters.length)}
                </span>
              </button>
            );
          })}
        </div>
        <input type="hidden" name="profession" value={profession} />
        {errors.professionKey && (
          <small className="text-danger">{errors.professionKey}</small>
        )}
      </fieldset>

      {profession && (
        <div className="grid gap-5 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Field
            label={recipes ? de.requests.recipe : de.requests.item}
            error={errors.item}
          >
            {recipes ? (
              <SelectField
                name="item"
                value={recipe}
                onChange={setRecipe}
                placeholder={de.requests.chooseRecipe}
                disabled={loadingRecipes}
                options={recipes}
              />
            ) : (
              <TextInput
                name="item"
                required
                maxLength={100}
                disabled={loadingRecipes}
                placeholder={de.requests.itemFreeText}
              />
            )}
          </Field>
          <div className="flex flex-col gap-1 text-sm">
            <span id="quantity-label" className="font-medium">
              {de.requests.quantity}
            </span>
            <div
              role="group"
              aria-labelledby="quantity-label"
              className="flex items-center gap-1.5"
            >
              <Button
                type="button"
                variant="secondary"
                icon="pi pi-minus"
                aria-label={de.requests.fewer}
                disabled={quantity <= 1}
                onClick={() => changeQuantity(quantity - 1)}
              />
              <TextInput
                name="quantity"
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_QUANTITY}
                value={String(quantity)}
                aria-labelledby="quantity-label"
                onChange={(event) => changeQuantity(Number(event.target.value))}
                className="max-w-20 text-center"
              />
              <Button
                type="button"
                variant="secondary"
                icon="pi pi-plus"
                aria-label={de.requests.more}
                disabled={quantity >= MAX_QUANTITY}
                onClick={() => changeQuantity(quantity + 1)}
              />
            </div>
            {errors.quantity && (
              <small className="text-danger">{errors.quantity}</small>
            )}
          </div>
        </div>
      )}

      {profession && (chosenRecipe || !recipes) && (
        <div className="flex flex-col gap-1.5 rounded-2xl bg-raised px-4 py-3">
          {chosenRecipe && chosenRecipe.reagents.length > 0 && (
            <>
              <span className="text-xs font-bold tracking-wider text-muted uppercase">
                {de.requests.totalNeeds}
              </span>
              <span className="text-sm leading-relaxed">
                {chosenRecipe.reagents
                  .map(
                    (reagent) => `${reagent.count * quantity}× ${reagent.name}`,
                  )
                  .join(" · ")}
              </span>
            </>
          )}
          <span
            className={`text-[13px] ${crafters.length > 0 ? "text-success" : "font-semibold text-warning"}`}
          >
            {crafters.length > 0
              ? de.requests.craftersFor(crafters.join(", "))
              : de.requests.nobodyForRecipe}
          </span>
        </div>
      )}

      <Field
        label={`${de.requests.notes} (${de.requests.optional})`}
        error={errors.notes}
      >
        <TextInput
          name="notes"
          maxLength={300}
          placeholder={de.requests.notePlaceholder}
        />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          disabled={pending || !profession}
          icon="pi pi-send"
          label={de.requests.submit}
        />
        <FormMessage state={state} />
      </div>
    </form>
  );
}
