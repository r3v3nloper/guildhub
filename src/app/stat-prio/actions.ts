"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  formText,
  guarded,
  type ActionState,
} from "@/lib/actions/action-state";
import type { Actor } from "@/lib/auth/guards";
import { actorForAction } from "@/lib/auth/current-actor";
import { getDb, type AppDatabase } from "@/lib/db/client";
import {
  createStatPriority,
  deleteStatPriority,
  updateStatPriority,
  type StatPriorityInput,
  type StatPriorityResult,
} from "@/lib/guild/stat-priorities";

function inputOf(formData: FormData): StatPriorityInput {
  return {
    title: formText(formData, "title"),
    stats: formText(formData, "stats"),
    notes: formText(formData, "notes"),
    source: formText(formData, "source"),
  };
}

async function saveAction(
  save: (db: AppDatabase, actor: Actor) => StatPriorityResult,
): Promise<ActionState> {
  const state = await guarded(async () => {
    const result = save(getDb(), await actorForAction());
    return result.ok ? { ok: true } : { ok: false, errors: result.errors };
  });
  if (state.ok) {
    revalidatePath("/stat-prio");
    redirect("/stat-prio");
  }
  return state;
}

export async function createStatPriorityAction(
  classEntryId: number,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return saveAction((db, actor) =>
    createStatPriority(db, actor, classEntryId, inputOf(formData)),
  );
}

export async function updateStatPriorityAction(
  priorityId: number,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return saveAction((db, actor) =>
    updateStatPriority(db, actor, priorityId, inputOf(formData)),
  );
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
