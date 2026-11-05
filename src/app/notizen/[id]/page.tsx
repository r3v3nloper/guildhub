import type { Metadata } from "next";
import { GuildNoteForm } from "@/components/notes/GuildNoteForm";
import { ActionForm } from "@/components/ui/ActionForm";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { FormPage } from "@/components/ui/FormPage";
import { PageSuspense } from "@/components/ui/PageSuspense";
import { requireActor } from "@/lib/auth/current-actor";
import { getDb } from "@/lib/db/client";
import { getGuildNote } from "@/lib/guild/guild-notes";
import { guildNoteGameOptions } from "@/lib/guild/guild-note-options";
import { idParam, orNotFound } from "@/lib/not-found";
import { de } from "@/i18n/de";
import { deleteGuildNoteAction, saveGuildNoteAction } from "../actions";

export const metadata: Metadata = { title: de.guildNotes.edit };

async function EditGuildNoteContent({ params }: PageProps<"/notizen/[id]">) {
  const actor = await requireActor();
  const db = getDb();
  const noteId = await idParam(params);
  const note = orNotFound(() => getGuildNote(db, actor, noteId));

  return (
    <FormPage
      backHref="/notizen"
      backLabel={de.common.backTo(de.guildNotes.title)}
      title={de.guildNotes.edit}
      danger={{
        title: de.guildNotes.deleteTitle,
        text: de.guildNotes.deleteHint,
        action: (
          <ActionForm action={deleteGuildNoteAction.bind(null, note.id)}>
            <ConfirmButton
              question={de.guildNotes.deleteConfirm}
              variant="danger"
              text
            >
              {de.common.delete}
            </ConfirmButton>
          </ActionForm>
        ),
      }}
    >
      <GuildNoteForm
        action={saveGuildNoteAction.bind(null, note.id)}
        values={{
          title: note.title,
          body: note.body,
          gameId: note.gameId ?? "",
          pinned: note.pinned,
        }}
        games={guildNoteGameOptions(db, actor.guildId)}
        cancelHref="/notizen"
      />
    </FormPage>
  );
}

export default function EditGuildNotePage(props: PageProps<"/notizen/[id]">) {
  return (
    <PageSuspense>
      <EditGuildNoteContent {...props} />
    </PageSuspense>
  );
}
