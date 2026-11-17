"use server";

import { redirect } from "next/navigation";
import { flagArg, idArg, parseArg } from "@/lib/actions/action-args";
import {
  formText,
  guarded,
  type ActionState,
} from "@/lib/actions/action-state";
import { revalidatePages, runMutation } from "@/lib/actions/mutation";
import { PAGE_GROUPS } from "@/lib/actions/page-groups";
import type { Actor } from "@/lib/auth/guards";
import { actorForAction } from "@/lib/auth/current-actor";
import { getDb, type AppDatabase } from "@/lib/db/client";
import {
  createGuildNote,
  deleteGuildNote,
  setGuildNotePinned,
  updateGuildNote,
  type GuildNoteInput,
  type GuildNoteResult,
} from "@/lib/guild/guild-notes";

const NOTES_PAGE = "/notizen";

function inputOf(formData: FormData): GuildNoteInput {
  return {
    title: formText(formData, "title"),
    body: formText(formData, "body"),
    gameId: formText(formData, "game"),
    pinned: formText(formData, "pinned") === "on",
  };
}

async function saveAction(
  save: (db: AppDatabase, actor: Actor) => GuildNoteResult,
): Promise<ActionState> {
  const state = await guarded(async () => {
    const result = save(getDb(), await actorForAction());
    return result.ok ? { ok: true } : { ok: false, errors: result.errors };
  });
  if (state.ok) {
    revalidatePages(PAGE_GROUPS.guildNotes);
    redirect(NOTES_PAGE);
  }
  return state;
}

/** Creates a note without `noteId`, otherwise saves the existing one. */
export async function saveGuildNoteAction(
  noteId: number | undefined,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const input = inputOf(formData);
  return saveAction((db, actor) =>
    noteId === undefined
      ? createGuildNote(db, actor, input)
      : updateGuildNote(db, actor, parseArg(idArg, noteId), input),
  );
}

export async function setGuildNotePinnedAction(
  noteId: number,
  pinned: boolean,
): Promise<ActionState> {
  return runMutation(PAGE_GROUPS.guildNotes, (db, actor) =>
    setGuildNotePinned(
      db,
      actor,
      parseArg(idArg, noteId),
      parseArg(flagArg, pinned),
    ),
  );
}

/** Delete from the notes page's menu: the page stays where it is. */
export async function removeGuildNoteAction(
  noteId: number,
): Promise<ActionState> {
  return runMutation(PAGE_GROUPS.guildNotes, (db, actor) =>
    deleteGuildNote(db, actor, parseArg(idArg, noteId)),
  );
}

/** Delete from the edit page, then back to the list. */
export async function deleteGuildNoteAction(
  noteId: number,
): Promise<ActionState> {
  const state = await removeGuildNoteAction(noteId);
  if (state.ok) {
    redirect(NOTES_PAGE);
  }
  return state;
}
