"use client";

import { useState, useTransition } from "react";
import { Button, Field, FormMessage, TextArea } from "@/components/ui/ui";
import type { ActionState } from "@/lib/actions/action-state";
import type {
  ImportChoices,
  ImportOutcome,
  ImportRequestAction,
} from "@/lib/addon/character-import";
import type { ImportCharacterView } from "@/lib/addon/import-view";
import { de } from "@/i18n/de";
import { ImportCharacterCard } from "./ImportCharacterCard";
import { RequestActionList } from "./RequestActionList";
import { SkippedAccountList } from "./SkippedAccountList";
import { useImportChoices } from "./use-import-choices";

/**
 * Paste the addon's export, see what would change, then apply it. The preview is only
 * shown here; applying sends the same text again and the server works it out anew.
 */
export function AddonImport({
  preview,
  apply,
}: {
  preview: (text: string) => Promise<
    ActionState & {
      characters?: ImportCharacterView[];
      requestActions?: ImportRequestAction[];
      skippedAccounts?: string[];
    }
  >;
  apply: (
    text: string,
    choices: ImportChoices,
  ) => Promise<
    ActionState & {
      outcomes?: ImportOutcome[];
      requestActions?: ImportRequestAction[];
    }
  >;
}) {
  const texts = de.addonImport;
  const [text, setText] = useState("");
  const [characters, setCharacters] = useState<ImportCharacterView[]>();
  const { choices, toggleCreate, toggleDrop, reset } = useImportChoices();
  const [outcomes, setOutcomes] = useState<ImportOutcome[]>();
  const [requestActions, setRequestActions] = useState<ImportRequestAction[]>(
    [],
  );
  const [skippedAccounts, setSkippedAccounts] = useState<string[]>([]);
  const [state, setState] = useState<ActionState>({});
  const [pending, startTransition] = useTransition();

  const showPreview = () =>
    startTransition(async () => {
      const result = await preview(text);
      setState(result.ok ? {} : result);
      setCharacters(result.characters);
      setRequestActions(result.requestActions ?? []);
      setSkippedAccounts(result.skippedAccounts ?? []);
      reset();
      setOutcomes(undefined);
    });

  const applyChoices = () =>
    startTransition(async () => {
      const result = await apply(text, choices);
      setState(result);
      setOutcomes(result.outcomes);
      if (result.requestActions) {
        setRequestActions(result.requestActions);
      }
    });

  const startOver = () => {
    setText("");
    setCharacters(undefined);
    setRequestActions([]);
    setSkippedAccounts([]);
    setOutcomes(undefined);
    setState({});
  };

  const applicable =
    requestActions.some((action) => action.result === "applied") ||
    characters?.some(
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
      <RequestActionList
        actions={requestActions}
        applied={outcomes !== undefined}
      />
      <SkippedAccountList accounts={skippedAccounts} />
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
