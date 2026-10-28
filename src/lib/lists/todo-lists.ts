import { and, asc, eq, inArray, isNotNull } from "drizzle-orm";
import { assertAllowed, permissions, type Actor } from "@/lib/auth/guards";
import type { AppDatabase } from "@/lib/db/client";
import { todoItems, todoLists } from "@/lib/db/schema";
import { DomainError, NotFoundError } from "@/lib/errors";

export type TodoListRow = typeof todoLists.$inferSelect;
export type TodoItemRow = typeof todoItems.$inferSelect;

export interface TodoListView extends TodoListRow {
  items: TodoItemRow[];
}

const MAX_NAME = 60;
const MAX_TEXT = 200;

/** The user's named to-do lists with one-off items, no resets (SPEC 10, Phase 2). */
export function listTodoLists(db: AppDatabase, userId: string): TodoListView[] {
  const lists = db
    .select()
    .from(todoLists)
    .where(eq(todoLists.ownerId, userId))
    .orderBy(asc(todoLists.id))
    .all();
  if (lists.length === 0) {
    return [];
  }
  const items = db
    .select()
    .from(todoItems)
    .where(
      inArray(
        todoItems.listId,
        lists.map((list) => list.id),
      ),
    )
    .orderBy(asc(todoItems.id))
    .all();
  return lists.map((list) => ({
    ...list,
    items: items.filter((item) => item.listId === list.id),
  }));
}

function requiredText(value: string, max: number, what: string): string {
  const text = value.trim();
  if (!text) {
    throw new DomainError(`Bitte ${what} eingeben.`);
  }
  if (text.length > max) {
    throw new DomainError(`Höchstens ${max} Zeichen.`);
  }
  return text;
}

function ownList(db: AppDatabase, actor: Actor, listId: number): TodoListRow {
  const list = db
    .select()
    .from(todoLists)
    .where(eq(todoLists.id, listId))
    .get();
  if (!list || list.ownerId !== actor.userId) {
    throw new NotFoundError("Liste");
  }
  assertAllowed(permissions.editOwnData(actor, list.ownerId));
  return list;
}

function ownItem(db: AppDatabase, actor: Actor, itemId: number): TodoItemRow {
  const item = db
    .select()
    .from(todoItems)
    .where(eq(todoItems.id, itemId))
    .get();
  if (!item) {
    throw new NotFoundError("Eintrag");
  }
  ownList(db, actor, item.listId);
  return item;
}

export function createTodoList(
  db: AppDatabase,
  actor: Actor,
  name: string,
): number {
  assertAllowed(permissions.editOwnData(actor, actor.userId));
  return db
    .insert(todoLists)
    .values({
      ownerId: actor.userId,
      name: requiredText(name, MAX_NAME, "einen Namen"),
    })
    .returning()
    .get().id;
}

export function deleteTodoList(
  db: AppDatabase,
  actor: Actor,
  listId: number,
): void {
  ownList(db, actor, listId);
  db.delete(todoLists).where(eq(todoLists.id, listId)).run();
}

export function addTodoItem(
  db: AppDatabase,
  actor: Actor,
  listId: number,
  text: string,
): void {
  ownList(db, actor, listId);
  db.insert(todoItems)
    .values({ listId, text: requiredText(text, MAX_TEXT, "einen Eintrag") })
    .run();
}

export function setTodoItemDone(
  db: AppDatabase,
  actor: Actor,
  itemId: number,
  done: boolean,
  now: Date = new Date(),
): void {
  ownItem(db, actor, itemId);
  db.update(todoItems)
    .set({ doneAt: done ? now : null })
    .where(eq(todoItems.id, itemId))
    .run();
}

export function deleteTodoItem(
  db: AppDatabase,
  actor: Actor,
  itemId: number,
): void {
  ownItem(db, actor, itemId);
  db.delete(todoItems).where(eq(todoItems.id, itemId)).run();
}

/** Removes every finished item of a list. */
export function clearDoneItems(
  db: AppDatabase,
  actor: Actor,
  listId: number,
): void {
  ownList(db, actor, listId);
  db.delete(todoItems)
    .where(and(eq(todoItems.listId, listId), isNotNull(todoItems.doneAt)))
    .run();
}
