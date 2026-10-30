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
  getStatPriority,
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

/** The overview with the class picked, where officers came from. */
function classPage(classEntryId: number): string {
  return `/stat-prio?klasse=${classEntryId}`;
}

async function saveAction(
  save: (
    db: AppDatabase,
    actor: Actor,
  ) => { result: StatPriorityResult; classEntryId: number },
): Promise<ActionState> {
  let target = "/stat-prio";
  const state = await guarded(async () => {
    const { result, classEntryId } = save(getDb(), await actorForAction());
    target = classPage(classEntryId);
    return result.ok ? { ok: true } : { ok: false, errors: result.errors };
  });
  if (state.ok) {
    revalidatePath("/stat-prio");
    redirect(target);
  }
  return state;
}

export async function createStatPriorityAction(
  classEntryId: number,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return saveAction((db, actor) => ({
    result: createStatPriority(db, actor, classEntryId, inputOf(formData)),
    classEntryId,
  }));
}

export async function updateStatPriorityAction(
  priorityId: number,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return saveAction((db, actor) => ({
    classEntryId: getStatPriority(db, actor, priorityId).classEntryId,
    result: updateStatPriority(db, actor, priorityId, inputOf(formData)),
  }));
}

export async function deleteStatPriorityAction(
  priorityId: number,
): Promise<ActionState> {
  let target = "/stat-prio";
  const state = await guarded(async () => {
    const db = getDb();
    const actor = await actorForAction();
    target = classPage(getStatPriority(db, actor, priorityId).classEntryId);
    deleteStatPriority(db, actor, priorityId);
    return { ok: true };
  });
  if (state.ok) {
    revalidatePath("/stat-prio");
    redirect(target);
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

/** Delete from the overview's menu: the page stays where it is. */
export async function removeStatPriorityAction(
  priorityId: number,
): Promise<ActionState> {
  const state = await guarded(async () => {
    deleteStatPriority(
      getDb(),
      await actorForAction(),
      parseArg(idArg, priorityId),
    );
    return { ok: true };
  });
  revalidatePath("/stat-prio");
  return state;
}
