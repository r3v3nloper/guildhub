import type { ReactNode } from "react";
import type { GuildNoteView } from "@/lib/guild/guild-notes";
import { formatDateTime } from "@/i18n/format";
import { de } from "@/i18n/de";
import { NoteText } from "./NoteText";

/** One guild note: title, game, text and who changed it last; officers get `actions`. */
export function GuildNoteCard({
  note,
  gameName,
  actions,
  showPinned = true,
}: {
  note: GuildNoteView;
  /** Name of the note's game; none for notes that apply to every game. */
  gameName?: string;
  actions?: ReactNode;
  /** The overview only shows pinned notes, so the marker says nothing there. */
  showPinned?: boolean;
}) {
  const headingId = `guild-note-${note.id}`;
  return (
    <article
      aria-labelledby={headingId}
      className={`flex flex-col gap-3 rounded-[22px] border bg-surface p-4.5 md:p-5 ${
        showPinned && note.pinned ? "border-[#6e58c8]" : "border-border"
      }`}
    >
      <header className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-bold tracking-widest text-muted uppercase">
            <span className="flex items-center gap-1.5">
              <i className="pi pi-book text-accent" aria-hidden />
              {gameName ?? de.guildNotes.allGames}
            </span>
            {showPinned && note.pinned && (
              <span className="flex items-center gap-1 text-accent-strong">
                <i className="pi pi-thumbtack text-[11px]" aria-hidden />
                {de.guildNotes.pinned}
              </span>
            )}
          </span>
          <h3 id={headingId} className="text-lg font-bold text-white">
            {note.title}
          </h3>
        </div>
        {actions && <div className="flex shrink-0 items-center">{actions}</div>}
      </header>
      <NoteText text={note.body} />
      <footer className="text-xs text-muted">
        {de.guildNotes.updated(
          note.updatedByName,
          formatDateTime(note.updatedAt),
        )}
      </footer>
    </article>
  );
}
