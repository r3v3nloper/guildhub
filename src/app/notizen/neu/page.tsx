import type { Metadata } from "next";
import { GuildNoteForm } from "@/components/notes/GuildNoteForm";
import { FormPage } from "@/components/ui/FormPage";
import { PageSuspense } from "@/components/ui/PageSuspense";
import { requireActor } from "@/lib/auth/current-actor";
import { assertAllowed, permissions } from "@/lib/auth/guards";
import { getDb } from "@/lib/db/client";
import { orNotFound } from "@/lib/not-found";
import { guildNoteGameOptions } from "@/lib/guild/guild-note-options";
import { de } from "@/i18n/de";
import { saveGuildNoteAction } from "../actions";

export const metadata: Metadata = { title: de.guildNotes.new };

async function NewGuildNoteContent() {
  const actor = await requireActor();
  orNotFound(() => assertAllowed(permissions.manageGuildNotes(actor)));

  return (
    <FormPage
      backHref="/notizen"
      backLabel={de.common.backTo(de.guildNotes.title)}
      title={de.guildNotes.new}
    >
      <GuildNoteForm
        action={saveGuildNoteAction.bind(null, undefined)}
        values={{ title: "", body: "", gameId: "", pinned: false }}
        games={guildNoteGameOptions(getDb(), actor.guildId)}
        cancelHref="/notizen"
      />
    </FormPage>
  );
}

export default function NewGuildNotePage() {
  return (
    <PageSuspense>
      <NewGuildNoteContent />
    </PageSuspense>
  );
}
