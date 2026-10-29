"use client";

import { useState, useTransition } from "react";
import { SelectField, type SelectOption } from "@/components/ui/SelectField";
import { Button } from "@/components/ui/ui";
import type { ActionState } from "@/lib/actions/action-state";
import { de } from "@/i18n/de";

/** "+ Beruf hinzufügen": picks one of the professions the character does not have yet. */
export function AddProfession({
  options,
  currentKeys,
  setProfessions,
}: {
  /** Professions the character does not have yet. */
  options: SelectOption[];
  currentKeys: string[];
  /** Bound server action that stores the full list. */
  setProfessions: (professionKeys: string[]) => Promise<ActionState>;
}) {
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  if (options.length === 0) {
    return (
      <p className="text-center text-[13px] text-muted">
        {de.characters.noMoreProfessions}
      </p>
    );
  }
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-14 items-center justify-center gap-2 rounded-[20px] border border-dashed border-[#3a3358] text-sm font-bold text-accent-strong hover:bg-surface"
      >
        <i className="pi pi-plus text-xs" aria-hidden />
        {de.characters.addProfession}
      </button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[20px] border border-[#2c2645] bg-surface p-4">
      <div className="min-w-56 flex-1">
        <SelectField
          name="profession"
          value={choice}
          placeholder={de.characters.chooseProfession}
          aria-label={de.characters.chooseProfession}
          options={options}
          onChange={setChoice}
        />
      </div>
      <Button
        type="button"
        icon="pi pi-plus"
        label={de.common.add}
        disabled={!choice || pending}
        onClick={() =>
          startTransition(async () => {
            const result = await setProfessions([...currentKeys, choice]);
            if (result.ok) {
              setOpen(false);
              setChoice("");
              setError(undefined);
            } else {
              setError(result.message);
            }
          })
        }
      />
      <Button
        type="button"
        variant="secondary"
        text
        label={de.common.cancel}
        onClick={() => setOpen(false)}
      />
      {error && (
        <p role="alert" className="w-full text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
