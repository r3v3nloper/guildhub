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
import { deleteFarmSpot, saveFarmSpot } from "@/lib/lists/farm-spots";

export async function saveFarmSpotAction(
  spotId: number | undefined,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const state = await guarded(async () => {
    const result = saveFarmSpot(
      getDb(),
      await actorForAction(),
      {
        gameId: formText(formData, "game"),
        professionKey: formText(formData, "profession"),
        resource: formText(formData, "resource"),
        zone: formText(formData, "zone"),
        coordinates: formText(formData, "coordinates"),
        link: formText(formData, "link"),
        notes: formText(formData, "notes"),
        visibility: formText(formData, "visibility"),
      },
      spotId,
    );
    return result.ok ? { ok: true } : { ok: false, errors: result.errors };
  });
  if (state.ok) {
    revalidatePath("/farmspots");
    redirect("/farmspots");
  }
  return state;
}

export async function deleteFarmSpotAction(
  spotId: number,
): Promise<ActionState> {
  const state = await guarded(async () => {
    deleteFarmSpot(getDb(), await actorForAction(), spotId);
    return { ok: true };
  });
  if (state.ok) {
    revalidatePath("/farmspots");
  }
  return state;
}
