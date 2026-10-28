"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  formNumber,
  formText,
  guarded,
  type ActionState,
} from "@/lib/actions/action-state";
import { actorForAction } from "@/lib/auth/current-actor";
import { getDb } from "@/lib/db/client";
import {
  deleteCustomTask,
  saveCustomTask,
  type CustomTaskInput,
} from "@/lib/tasks/custom-tasks";

function customTaskInputOf(formData: FormData): CustomTaskInput {
  return {
    title: formText(formData, "title"),
    gameId: formText(formData, "game"),
    kind: formText(formData, "kind"),
    scope: formText(formData, "scope"),
    category: formText(formData, "category"),
    link: formText(formData, "link"),
    rule: formText(formData, "rule"),
    ruleType: formText(formData, "ruleType"),
    ruleTime: formText(formData, "ruleTime"),
    ruleWeekday: formNumber(formData, "ruleWeekday"),
    ruleDayOfMonth: formNumber(formData, "ruleDayOfMonth"),
    ruleNDays: formNumber(formData, "ruleNDays"),
    ruleAnchor: formText(formData, "ruleAnchor"),
    cap: formNumber(formData, "cap"),
    alertAt: formNumber(formData, "alertAt"),
    regenAmount: formNumber(formData, "regenAmount"),
    regenIntervalMinutes: formNumber(formData, "regenIntervalMinutes"),
    regenAlignment: formText(formData, "regenAlignment"),
    perPeriodGain: formNumber(formData, "perPeriodGain"),
  };
}

export async function saveCustomTaskAction(
  taskId: number | undefined,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const state = await guarded(async () => {
    const result = saveCustomTask(
      getDb(),
      await actorForAction(),
      customTaskInputOf(formData),
      taskId,
    );
    return result.ok ? { ok: true } : { ok: false, errors: result.errors };
  });
  if (state.ok) {
    revalidatePath("/");
    revalidatePath("/aufgaben");
    redirect("/aufgaben");
  }
  return state;
}

export async function deleteCustomTaskAction(
  taskId: number,
): Promise<ActionState> {
  const state = await guarded(async () => {
    deleteCustomTask(getDb(), await actorForAction(), taskId);
    return { ok: true };
  });
  if (state.ok) {
    revalidatePath("/");
    revalidatePath("/aufgaben");
  }
  return state;
}
