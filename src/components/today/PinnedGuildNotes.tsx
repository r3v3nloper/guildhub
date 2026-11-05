import Link from "next/link";
import { GuildNoteCard } from "@/components/notes/GuildNoteCard";
import type { GuildNoteView } from "@/lib/guild/guild-notes";
import { de } from "@/i18n/de";

/** Notes the officers pinned, for everyone on the overview (SPEC 7.5). */
export function PinnedGuildNotes({
  notes,
  gameNames,
}: {
  notes: GuildNoteView[];
  gameNames: ReadonlyMap<string, string>;
}) {
  if (notes.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="pinned-notes" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2
          id="pinned-notes"
          className="text-[13px] font-bold tracking-[0.1em] text-muted uppercase"
        >
          {de.guildNotes.title}
        </h2>
        <Link
          href="/notizen"
          className="text-xs font-semibold text-accent-strong hover:text-white"
        >
          {de.guildNotes.showAll}
        </Link>
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        {notes.map((note) => (
          <GuildNoteCard
            key={note.id}
            note={note}
            gameName={note.gameId ? gameNames.get(note.gameId) : undefined}
            showPinned={false}
          />
        ))}
      </div>
    </section>
  );
}
