"use client";

import { useOptimistic } from "react";
import { setGuildNotePinnedAction } from "@/app/notizen/actions";
import { useOptimisticAction } from "@/components/ui/use-optimistic-action";
import { de } from "@/i18n/de";

/** Pins a note to everyone's overview or takes it off again. */
export function PinToggle({
  noteId,
  title,
  pinned,
}: {
  noteId: number;
  title: string;
  pinned: boolean;
}) {
  const [shown, setShown] = useOptimistic(pinned);
  const { pending, error, run } = useOptimisticAction();
  const next = !shown;

  return (
    <span className="flex flex-col items-end">
      <button
        type="button"
        aria-pressed={shown}
        aria-busy={pending}
        aria-label={
          shown ? de.guildNotes.unpinFor(title) : de.guildNotes.pinFor(title)
        }
        title={shown ? de.guildNotes.unpin : de.guildNotes.pin}
        onClick={() =>
          run(
            () => setGuildNotePinnedAction(noteId, next),
            () => setShown(next),
          )
        }
        className={`flex h-11 w-11 items-center justify-center rounded-xl hover:bg-raised ${
          shown ? "text-accent-strong" : "text-muted hover:text-foreground"
        }`}
      >
        <i
          className={`pi pi-thumbtack ${shown ? "" : "rotate-45"}`}
          aria-hidden
        />
      </button>
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </span>
  );
}
