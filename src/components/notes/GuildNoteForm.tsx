"use client";

import { CheckboxField, SelectField } from "@/components/ui/SelectField";
import {
  Button,
  Field,
  FormMessage,
  TextArea,
  TextInput,
} from "@/components/ui/ui";
import { useFormAction } from "@/components/ui/use-form-action";
import type { ActionState } from "@/lib/actions/action-state";
import {
  GUILD_NOTE_BODY_MAX,
  GUILD_NOTE_TITLE_MAX,
} from "@/lib/guild/guild-note-limits";
import { de } from "@/i18n/de";

export interface GuildNoteFormValues {
  title: string;
  body: string;
  /** Empty for every game. */
  gameId: string;
  pinned: boolean;
}

export function GuildNoteForm({
  action,
  values,
  games,
  cancelHref,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  values: GuildNoteFormValues;
  /** The guild's enabled games. */
  games: Array<{ value: string; label: string }>;
  cancelHref: string;
}) {
  const { state, pending, onSubmit } = useFormAction(action);
  const errors = state.errors ?? {};

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <Field
        label={de.guildNotes.fieldTitle}
        error={errors.title}
        hint={de.guildNotes.fieldTitleHint}
      >
        <TextInput
          name="title"
          defaultValue={values.title}
          required
          maxLength={GUILD_NOTE_TITLE_MAX}
        />
      </Field>
      <Field
        label={de.guildNotes.fieldGame}
        error={errors.gameId}
        hint={de.guildNotes.fieldGameHint}
      >
        <SelectField
          name="game"
          defaultValue={values.gameId}
          emptyLabel={de.guildNotes.allGames}
          options={games}
        />
      </Field>
      <Field
        label={de.guildNotes.fieldBody}
        error={errors.body}
        hint={de.guildNotes.fieldBodyHint}
      >
        <TextArea
          name="body"
          defaultValue={values.body}
          required
          rows={8}
          maxLength={GUILD_NOTE_BODY_MAX}
        />
      </Field>
      <CheckboxField
        name="pinned"
        label={de.guildNotes.fieldPinned}
        defaultChecked={values.pinned}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={pending}>{de.common.save}</Button>
        <a
          href={cancelHref}
          className="flex min-h-10 items-center rounded-xl px-3 text-sm font-semibold text-soft hover:bg-raised hover:text-white"
        >
          {de.common.cancel}
        </a>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
