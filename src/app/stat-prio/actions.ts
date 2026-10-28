"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  formText,
  guarded,
  type ActionState,
} from "@/lib/actions/action-state";
import { actorForAction } from "@/lib/auth/current-actor";
import { getDb } from "@/lib/db/client";
import {
  deleteStatPriority,
  saveStatPriority,
} from "@/lib/guild/stat-priorities";

/** `target` is bound on the server: the class for a new ranking, or the ranking to edit. */
export async function saveStatPriorityAction(
  target: { classEntryId: number } | { priorityId: number },
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const state = await guarded(async () => {
    const result = saveStatPriority(
      getDb(),
      await actorForAction(),
      {
        title: formText(formData, "title"),
        stats: formText(formData, "stats"),
        notes: formText(formData, "notes"),
        source: formText(formData, "source"),
      },
      target,
    );
    return result.ok ? { ok: true } : { ok: false, errors: result.errors };
  });
  if (state.ok) {
    revalidatePath("/stat-prio");
    redirect("/stat-prio");
  }
  return state;
}

export async function deleteStatPriorityAction(
  priorityId: number,
): Promise<ActionState> {
  const state = await guarded(async () => {
    deleteStatPriority(getDb(), await actorForAction(), priorityId);
    return { ok: true };
  });
  if (state.ok) {
    revalidatePath("/stat-prio");
    redirect("/stat-prio");
  }
  return state;
}
