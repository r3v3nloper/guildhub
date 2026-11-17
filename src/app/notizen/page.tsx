import type { Metadata } from "next";
import { RequestMenu } from "@/components/guild/RequestMenu";
import { GuildNoteCard } from "@/components/notes/GuildNoteCard";
import { PinToggle } from "@/components/notes/PinToggle";
import { PageSuspense } from "@/components/ui/PageSuspense";
import { ButtonLink, PageHeader } from "@/components/ui/ui";
import { requireActor } from "@/lib/auth/current-actor";
import { permissions } from "@/lib/auth/guards";
import { getDb } from "@/lib/db/client";
import { selectedGames } from "@/lib/game-filter";
import { listGuildNotes } from "@/lib/guild/guild-notes";
import { localize } from "@/i18n/localize";
import { de } from "@/i18n/de";
import { removeGuildNoteAction } from "./actions";

export const metadata: Metadata = { title: de.guildNotes.title };

/** Every guild note for the shown games; officers write, pin and delete them here. */
async function GuildNotesContent() {
  const actor = await requireActor();
  const db = getDb();
  const { games } = await selectedGames(db, actor.guildId);
  const gameNames = new Map(
    games.map((game) => [game.id, localize(game.name)]),
  );
  const notes = listGuildNotes(
    db,
    games.map((game) => game.id),
  );
  const canEdit = permissions.manageGuildNotes(actor).allowed;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={de.guildNotes.title}
        meta={<p className="text-sm text-muted">{de.guildNotes.intro}</p>}
        actions={
          canEdit && (
            <ButtonLink href="/notizen/neu">+ {de.guildNotes.add}</ButtonLink>
          )
        }
      />
      {notes.length === 0 ? (
        <p className="rounded-[18px] border border-dashed border-[#2c2645] px-4.5 py-4 text-sm text-muted">
          {canEdit ? de.guildNotes.emptyOfficer : de.guildNotes.empty}
        </p>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          {notes.map((note) => (
            <GuildNoteCard
              key={note.id}
              note={note}
              gameName={note.gameId ? gameNames.get(note.gameId) : undefined}
              actions={
                canEdit && (
                  <>
                    <PinToggle
                      noteId={note.id}
                      title={note.title}
                      pinned={note.pinned}
                    />
                    <RequestMenu
                      label={de.guildNotes.menuFor(note.title)}
                      question={de.guildNotes.deleteConfirm}
                      editHref={`/notizen/${note.id}`}
                      onDelete={removeGuildNoteAction.bind(null, note.id)}
                    />
                  </>
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function GuildNotesPage() {
  return (
    <PageSuspense>
      <GuildNotesContent />
    </PageSuspense>
  );
}
