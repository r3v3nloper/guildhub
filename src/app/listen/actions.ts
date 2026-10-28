"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  formText,
  guarded,
  type ActionState,
} from "@/lib/actions/action-state";
import type { Actor } from "@/lib/auth/guards";
import { actorForAction } from "@/lib/auth/current-actor";
import { getDb, type AppDatabase } from "@/lib/db/client";
import { DomainError } from "@/lib/errors";
import {
  addTodoItem,
  clearDoneItems,
  createTodoList,
  deleteTodoItem,
  deleteTodoList,
  setTodoItemDone,
} from "@/lib/lists/todo-lists";

async function todoAction(
  change: (db: AppDatabase, actor: Actor) => void,
): Promise<ActionState> {
  const state = await guarded(async () => {
    change(getDb(), await actorForAction());
    return { ok: true };
  });
  revalidatePath("/listen");
  return state;
}

export async function createTodoListAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return todoAction((db, actor) =>
    createTodoList(db, actor, formText(formData, "name")),
  );
}

export async function deleteTodoListAction(
  listId: number,
): Promise<ActionState> {
  return todoAction((db, actor) => deleteTodoList(db, actor, listId));
}

export async function addTodoItemAction(
  listId: number,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return todoAction((db, actor) =>
    addTodoItem(db, actor, listId, formText(formData, "text")),
  );
}

export async function clearDoneItemsAction(
  listId: number,
): Promise<ActionState> {
  return todoAction((db, actor) => clearDoneItems(db, actor, listId));
}

/** Called directly from a client component, so the arguments are checked here. */
export async function setTodoItemDoneAction(
  itemId: number,
  done: boolean,
): Promise<ActionState> {
  return todoAction((db, actor) => {
    if (!z.number().int().positive().safeParse(itemId).success) {
      throw new DomainError("Ungültige Eingabe.");
    }
    setTodoItemDone(db, actor, itemId, done === true);
  });
}

export async function deleteTodoItemAction(
  itemId: number,
): Promise<ActionState> {
  return todoAction((db, actor) => {
    if (!z.number().int().positive().safeParse(itemId).success) {
      throw new DomainError("Ungültige Eingabe.");
    }
    deleteTodoItem(db, actor, itemId);
  });
}
