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
import { createSpecBuild, deleteSpecBuild } from "@/lib/guild/spec-builds";
import { idArg, parseArg } from "@/lib/actions/action-args";
import { de } from "@/i18n/de";

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

/** The stat page lists the recommendations; every character page shows those of its specs. */
function revalidateSpecBuildPages(): void {
  revalidatePath("/stat-prio");
  revalidatePath("/charaktere", "layout");
}

export async function createSpecBuildAction(
  gameId: string,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const state = await guarded(async () => {
    const result = createSpecBuild(getDb(), await actorForAction(), gameId, {
      specKey: formText(formData, "spec"),
      title: formText(formData, "title"),
      url: formText(formData, "url"),
      notes: formText(formData, "notes"),
    });
    return result.ok
      ? { ok: true, message: de.common.saved }
      : { ok: false, errors: result.errors };
  });
  if (state.ok) {
    revalidateSpecBuildPages();
  }
  return state;
}

export async function deleteSpecBuildAction(
  buildId: number,
): Promise<ActionState> {
  const state = await guarded(async () => {
    deleteSpecBuild(getDb(), await actorForAction(), parseArg(idArg, buildId));
    return { ok: true };
  });
  revalidateSpecBuildPages();
  return state;
}
