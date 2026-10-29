"use server";

import { revalidatePath } from "next/cache";
import {
  formNumber,
  formText,
  guarded,
  type ActionState,
} from "@/lib/actions/action-state";
import { runMutation } from "@/lib/actions/mutation";
import { actorForAction } from "@/lib/auth/current-actor";
import { getDb } from "@/lib/db/client";
import {
  acceptCraftRequest,
  createCraftRequest,
  deleteCraftRequest,
  finishCraftRequest,
  requestRecipeChoices,
  returnCraftRequest,
  type RequestRecipeChoice,
} from "@/lib/guild/craft-requests";
import { parseArg } from "@/lib/actions/action-args";
import { z } from "zod";
import { de } from "@/i18n/de";

// "/" shows the requests a member can craft, and the navigation counts them.
const REQUESTS = ["/antraege", "/"];

export async function createCraftRequestAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const state = await guarded(async () => {
    const result = createCraftRequest(getDb(), await actorForAction(), {
      gameId: formText(formData, "game"),
      professionKey: formText(formData, "profession"),
      item: formText(formData, "item"),
      quantity: formNumber(formData, "quantity"),
      notes: formText(formData, "notes"),
    });
    return result.ok
      ? { ok: true, message: de.requests.created }
      : { ok: false, errors: result.errors };
  });
  if (state.ok) {
    for (const path of REQUESTS) {
      revalidatePath(path);
    }
  }
  return state;
}

export async function acceptCraftRequestAction(
  requestId: number,
): Promise<ActionState> {
  return runMutation(REQUESTS, (db, actor) =>
    acceptCraftRequest(db, actor, requestId),
  );
}

export async function finishCraftRequestAction(
  requestId: number,
): Promise<ActionState> {
  return runMutation(REQUESTS, (db, actor) =>
    finishCraftRequest(db, actor, requestId),
  );
}

export async function returnCraftRequestAction(
  requestId: number,
): Promise<ActionState> {
  return runMutation(REQUESTS, (db, actor) =>
    returnCraftRequest(db, actor, requestId),
  );
}

export async function deleteCraftRequestAction(
  requestId: number,
): Promise<ActionState> {
  return runMutation(REQUESTS, (db, actor) =>
    deleteCraftRequest(db, actor, requestId),
  );
}

/** The recipes a request for this profession must choose from; null means free text. */
export async function requestRecipeChoicesAction(
  gameId: string,
  professionKey: string,
): Promise<RequestRecipeChoice[] | null> {
  return requestRecipeChoices(
    getDb(),
    await actorForAction(),
    parseArg(z.string().min(1), gameId),
    parseArg(z.string().min(1), professionKey),
  );
}
