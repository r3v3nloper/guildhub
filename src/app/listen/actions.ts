"use server";

import { flagArg, idArg, parseArg } from "@/lib/actions/action-args";
import { formText, type ActionState } from "@/lib/actions/action-state";
import { runMutation } from "@/lib/actions/mutation";
import type { Actor } from "@/lib/auth/guards";
import type { AppDatabase } from "@/lib/db/client";
import {
  addTodoItem,
  clearDoneItems,
  createTodoList,
  deleteTodoItem,
  deleteTodoList,
  renameTodoList,
  setTodoItemDone,
} from "@/lib/lists/todo-lists";

const LISTS = ["/listen"];

function todoAction(change: (db: AppDatabase, actor: Actor) => void) {
  return runMutation(LISTS, change);
}

export async function createTodoListAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return todoAction((db, actor) =>
    createTodoList(
      db,
      actor,
      formText(formData, "name"),
      formText(formData, "visibility"),
    ),
  );
}

export async function renameTodoListAction(
  listId: number,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return todoAction((db, actor) =>
    renameTodoList(db, actor, listId, formText(formData, "name")),
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

export async function setTodoItemDoneAction(
  itemId: number,
  done: boolean,
): Promise<ActionState> {
  return todoAction((db, actor) =>
    setTodoItemDone(
      db,
      actor,
      parseArg(idArg, itemId),
      parseArg(flagArg, done),
    ),
  );
}

export async function deleteTodoItemAction(
  itemId: number,
): Promise<ActionState> {
  return todoAction((db, actor) =>
    deleteTodoItem(db, actor, parseArg(idArg, itemId)),
  );
}
