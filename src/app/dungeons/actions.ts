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
} from "@/lib/lists/checklists";

export async function saveChecklistAction(
  checklistId: number | undefined,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const state = await guarded(async () => {
    const result = saveChecklist(
      getDb(),
      await actorForAction(),
      {
        name: formText(formData, "name"),
        gameId: formText(formData, "game"),
        visibility: formText(formData, "visibility"),
        items: formText(formData, "items"),
      },
      checklistId,
    );
    return result.ok ? { ok: true } : { ok: false, errors: result.errors };
  });
  if (state.ok) {
    revalidatePath("/dungeons");
    redirect("/dungeons");
  }
  return state;
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

export async function resetChecklistRunAction(
  checklistId: number,
): Promise<ActionState> {
  return runMutation(["/dungeons"], (db, actor) =>
    resetChecklistRun(db, actor, checklistId),
  );
}

export async function setChecklistItemTickedAction(
  itemId: number,
  ticked: boolean,
): Promise<ActionState> {
  return runMutation(["/dungeons"], (db, actor) =>
    setChecklistItemTicked(
      db,
      actor,
      parseArg(idArg, itemId),
      parseArg(flagArg, ticked),
    ),
  );
}
