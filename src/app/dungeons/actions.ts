"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  formText,
  guarded,
  type ActionState,
} from "@/lib/actions/action-state";
import { flagArg, idArg, parseArg } from "@/lib/actions/action-args";
import { runMutation } from "@/lib/actions/mutation";
import { actorForAction } from "@/lib/auth/current-actor";
import { getDb } from "@/lib/db/client";
import {
  deleteChecklist,
  resetChecklistRun,
  saveChecklist,
  setChecklistItemTicked,
  setChecklistPinned,
} from "@/lib/lists/checklists";
import { deleteBoss, saveBoss } from "@/lib/lists/dungeon-bosses";
import { de } from "@/i18n/de";

// "/" shows pinned checklists on the dashboard.
const CHECKLISTS = ["/dungeons", "/"];

export async function saveChecklistAction(
  checklistId: number | undefined,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let savedId: number | undefined;
  const state = await guarded(async () => {
    const result = saveChecklist(
      getDb(),
      await actorForAction(),
      {
        name: formText(formData, "name"),
        gameId: formText(formData, "game"),
        visibility: formText(formData, "visibility"),
        items: formText(formData, "items"),
        notes: formText(formData, "notes"),
      },
      checklistId,
    );
    if (!result.ok) {
      return { ok: false, errors: result.errors };
    }
    savedId = result.checklistId;
    return { ok: true };
  });
  if (state.ok && savedId !== undefined) {
    for (const path of CHECKLISTS) {
      revalidatePath(path);
    }
    redirect(`/dungeons/${savedId}`);
  }
  return state;
}

export async function saveBossAction(
  checklistId: number,
  bossId: number | undefined,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const state = await guarded(async () => {
    const result = saveBoss(
      getDb(),
      await actorForAction(),
      checklistId,
      {
        name: formText(formData, "name"),
        mechanics: formText(formData, "mechanics"),
        loot: formText(formData, "loot"),
      },
      bossId,
    );
    return result.ok
      ? { ok: true, message: de.common.saved }
      : { ok: false, errors: result.errors };
  });
  if (state.ok) {
    revalidatePath(`/dungeons/${checklistId}`);
  }
  return state;
}

export async function deleteBossAction(
  checklistId: number,
  bossId: number,
): Promise<ActionState> {
  return runMutation([`/dungeons/${checklistId}`], (db, actor) =>
    deleteBoss(db, actor, checklistId, bossId),
  );
}

export async function deleteChecklistAction(
  checklistId: number,
): Promise<ActionState> {
  const state = await guarded(async () => {
    deleteChecklist(getDb(), await actorForAction(), checklistId);
    return { ok: true };
  });
  if (state.ok) {
    revalidatePath("/dungeons");
    redirect("/dungeons");
  }
  return state;
}

export async function setChecklistPinnedAction(
  checklistId: number,
  pinned: boolean,
): Promise<ActionState> {
  return runMutation(CHECKLISTS, (db, actor) =>
    setChecklistPinned(db, actor, checklistId, pinned),
  );
}

export async function resetChecklistRunAction(
  checklistId: number,
): Promise<ActionState> {
  return runMutation(CHECKLISTS, (db, actor) =>
    resetChecklistRun(db, actor, checklistId),
  );
}

export async function setChecklistItemTickedAction(
  itemId: number,
  ticked: boolean,
): Promise<ActionState> {
  return runMutation(CHECKLISTS, (db, actor) =>
    setChecklistItemTicked(
      db,
      actor,
      parseArg(idArg, itemId),
      parseArg(flagArg, ticked),
    ),
  );
}
