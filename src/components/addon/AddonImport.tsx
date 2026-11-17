"use client";

import { useState, useTransition } from "react";
import { Button, Field, FormMessage, TextArea } from "@/components/ui/ui";
import type { ActionState } from "@/lib/actions/action-state";
import type {
  ImportChoices,
  ImportOutcome,
} from "@/lib/addon/character-import";
import type { ImportCharacterView } from "@/lib/addon/import-view";
import { de } from "@/i18n/de";
import { ImportCharacterCard } from "./ImportCharacterCard";

const NO_CHOICES: ImportChoices = { create: [], dropProfessions: {} };

/**
 * Paste the addon's export, see what would change, then apply it. The preview is only
 * shown here; applying sends the same text again and the server works it out anew.
 */
export function AddonImport({
  preview,
  apply,
}: {
  preview: (
    text: string,
  ) => Promise<ActionState & { characters?: ImportCharacterView[] }>;
  apply: (
    text: string,
    choices: ImportChoices,
  ) => Promise<ActionState & { outcomes?: ImportOutcome[] }>;
}) {
  const texts = de.addonImport;
  const [text, setText] = useState("");
  const [characters, setCharacters] = useState<ImportCharacterView[]>();
  const [choices, setChoices] = useState<ImportChoices>(NO_CHOICES);
  const [outcomes, setOutcomes] = useState<ImportOutcome[]>();
  const [state, setState] = useState<ActionState>({});
  const [pending, startTransition] = useTransition();

  const showPreview = () =>
    startTransition(async () => {
      const result = await preview(text);
      setState(result.ok ? {} : result);
      setCharacters(result.characters);
      setChoices(NO_CHOICES);
      setOutcomes(undefined);
    });

  const applyChoices = () =>
    startTransition(async () => {
      const result = await apply(text, choices);
      setState(result);
      setOutcomes(result.outcomes);
    });

  const startOver = () => {
    setText("");
    setCharacters(undefined);
    setOutcomes(undefined);
    setState({});
  };

  const toggleCreate = (key: string, create: boolean) =>
    setChoices((current) => ({
      ...current,
      create: create
        ? [...current.create, key]
        : current.create.filter((entry) => entry !== key),
    }));

  const toggleDrop = (key: string, entryId: number, drop: boolean) =>
    setChoices((current) => {
      const dropped = current.dropProfessions[key] ?? [];
      return {
        ...current,
        dropProfessions: {
          ...current.dropProfessions,
          [key]: drop
            ? [...dropped, entryId]
            : dropped.filter((id) => id !== entryId),
        },
      };
    });

  const applicable = characters?.some(
    (character) =>
      character.status === "changed" ||
      (character.status === "new" && choices.create.includes(character.key)),
  );

  if (!characters) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-soft">{texts.intro}</p>
        <Field label={texts.text} hint={texts.textHint}>
          <TextArea
            name="export"
            rows={6}
            autoResize={false}
            value={text}
            onChange={(event) => setText(event.target.value)}
            className="font-mono text-xs"
          />
        </Field>
        <FormMessage state={state} />
        <div>
          <Button
            type="button"
            icon="pi pi-eye"
            label={texts.preview}
            disabled={!text.trim() || pending}
            loading={pending}
            onClick={showPreview}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {characters.map((character) => (
          <ImportCharacterCard
            key={character.key}
            character={character}
            create={choices.create.includes(character.key)}
            onCreateChange={(create) => toggleCreate(character.key, create)}
            dropped={choices.dropProfessions[character.key] ?? []}
            onDropChange={(entryId, drop) =>
              toggleDrop(character.key, entryId, drop)
            }
            outcome={outcomes?.find((entry) => entry.key === character.key)}
          />
        ))}
      </ul>
      <FormMessage state={state} />
      <div className="flex flex-wrap gap-2">
        {!outcomes && (
          <Button
            type="button"
            icon="pi pi-check"
            label={applicable ? texts.apply : texts.nothingToApply}
            disabled={!applicable || pending}
            loading={pending}
            onClick={applyChoices}
          />
        )}
        <Button
          type="button"
          variant="secondary"
          label={texts.again}
          disabled={pending}
          onClick={startOver}
        />
      </div>
    </div>
  );
}
