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
import { BUILD_STATUSES, type BuildStatus } from "@/lib/db/schema";
import type { CharacterInput } from "@/lib/roster/character-rules";
import {
  deleteBuild,
  deleteCharacter,
  saveBuild,
  saveCharacter,
} from "@/lib/roster/characters";
import { de } from "@/i18n/de";

function characterInputOf(formData: FormData): CharacterInput {
  return {
    name: formText(formData, "name"),
    server: formText(formData, "server"),
    factionKey: formText(formData, "faction"),
    raceKey: formText(formData, "race"),
    classKey: formText(formData, "class"),
    spec: formText(formData, "spec"),
    level: formNumber(formData, "level"),
    isMain: formData.get("isMain") === "on",
    notes: formText(formData, "notes"),
    professionKeys: formData
      .getAll("professions")
      .filter((value): value is string => typeof value === "string"),
  };
}

export async function saveCharacterAction(
  gameId: string,
  characterId: number | undefined,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let savedId: number | undefined;
  const state = await guarded(async () => {
    const actor = await actorForAction();
    const result = saveCharacter(
      getDb(),
      actor,
      gameId,
      characterInputOf(formData),
      characterId,
    );
    if (!result.ok) {
      return { ok: false, errors: result.errors };
    }
    savedId = result.characterId;
    return { ok: true, message: de.common.saved };
  });

  if (state.ok) {
    revalidatePath("/roster");
    revalidatePath("/charaktere");
    if (characterId === undefined && savedId !== undefined) {
      redirect(`/charaktere/${savedId}`);
    }
  }
  return state;
}

export async function deleteCharacterAction(
  characterId: number,
): Promise<void> {
  const actor = await actorForAction();
  deleteCharacter(getDb(), actor, characterId);
  revalidatePath("/roster");
  redirect("/charaktere");
}

function buildStatusOf(formData: FormData): BuildStatus {
  const status = formText(formData, "status");
  return (BUILD_STATUSES as readonly string[]).includes(status)
    ? (status as BuildStatus)
    : "current";
}

export async function saveBuildAction(
  characterId: number,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const state = await guarded(async () => {
    const actor = await actorForAction();
    const result = saveBuild(getDb(), actor, characterId, {
      title: formText(formData, "title"),
      url: formText(formData, "url"),
      status: buildStatusOf(formData),
      targetClassKey: formText(formData, "targetClass"),
      notes: formText(formData, "notes"),
    });
    return result.ok
      ? { ok: true, message: de.common.saved }
      : { ok: false, errors: result.errors };
  });
  if (state.ok) {
    revalidatePath(`/charaktere/${characterId}`);
    revalidatePath("/roster");
  }
  return state;
}

export async function deleteBuildAction(
  characterId: number,
  buildId: number,
): Promise<void> {
  const actor = await actorForAction();
  deleteBuild(getDb(), actor, characterId, buildId);
  revalidatePath(`/charaktere/${characterId}`);
  revalidatePath("/roster");
}
