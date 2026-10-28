import { and, asc, eq, inArray, isNotNull } from "drizzle-orm";
import { assertAllowed, permissions, type Actor } from "@/lib/auth/guards";
import type { AppDatabase } from "@/lib/db/client";
import { todoItems, todoLists, users } from "@/lib/db/schema";
import { DomainError, NotFoundError } from "@/lib/errors";
import { isVisibleTo, visibleToFilter } from "./visible-entries";
import { VISIBILITIES, type Visibility } from "./visibility";

export type TodoListRow = typeof todoLists.$inferSelect;
export type TodoItemRow = typeof todoItems.$inferSelect;

export interface TodoItemView extends TodoItemRow {
  doneByName: string | null;
  canDelete: boolean;
}

export interface TodoListView extends TodoListRow {
  ownerName: string | null;
  /** Rename, delete, clear finished entries. */
  canManage: boolean;
  items: TodoItemView[];
}

const MAX_NAME = 60;
const MAX_TEXT = 200;

/**
 * Named to-do lists with one-off entries, no resets (SPEC 10, Phase 2). Private lists
 * belong to their author; guild lists are shared state: every member adds and ticks, and
 * an entry ticked by one member is done for everyone.
 */
export function listTodoLists(db: AppDatabase, actor: Actor): TodoListView[] {
  const lists = db
    .select({ list: todoLists, ownerName: users.name })
    .from(todoLists)
    .innerJoin(users, eq(users.id, todoLists.ownerId))
    .where(visibleToFilter(todoLists, actor.userId))
    .orderBy(asc(todoLists.id))
    .all();
  if (lists.length === 0) {
    return [];
  }
  const items = db
    .select({ item: todoItems, doneByName: users.name })
    .from(todoItems)
    .leftJoin(users, eq(users.id, todoItems.doneBy))
    .where(
      inArray(
        todoItems.listId,
        lists.map(({ list }) => list.id),
      ),
    )
    .orderBy(asc(todoItems.id))
    .all();

  return lists.map(({ list, ownerName }) => {
    const canManage = permissions.editSharedEntry(actor, list).allowed;
    return {
      ...list,
      ownerName,
      canManage,
      items: items
        .filter(({ item }) => item.listId === list.id)
        .map(({ item, doneByName }) => ({
          ...item,
          doneByName,
          canDelete: canManage || item.createdBy === actor.userId,
        })),
    };
  });
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

function visibilityOf(value: string): Visibility {
  if (!VISIBILITIES.includes(value as Visibility)) {
    throw new DomainError("Bitte die Sichtbarkeit wählen.");
  }
  return value as Visibility;
}

/** A list the actor may see; other members' private lists do not exist for them. */
function visibleList(
  db: AppDatabase,
  actor: Actor,
  listId: number,
): TodoListRow {
  const list = db
    .select()
    .from(todoLists)
    .where(eq(todoLists.id, listId))
    .get();
  if (!list || !isVisibleTo(list, actor.userId)) {
    throw new NotFoundError("Liste");
  }
  // Adding and ticking: every active member on guild lists, the author on private ones.
  assertAllowed(permissions.editOwnData(actor, actor.userId));
  return list;
}

function managedList(
  db: AppDatabase,
  actor: Actor,
  listId: number,
): TodoListRow {
  const list = visibleList(db, actor, listId);
  assertAllowed(permissions.editSharedEntry(actor, list));
  return list;
}

function visibleItem(
  db: AppDatabase,
  actor: Actor,
  itemId: number,
): { item: TodoItemRow; list: TodoListRow } {
  const item = db
    .select()
    .from(todoItems)
    .where(eq(todoItems.id, itemId))
    .get();
  if (!item) {
    throw new NotFoundError("Eintrag");
  }
  return { item, list: visibleList(db, actor, item.listId) };
}

export function createTodoList(
  db: AppDatabase,
  actor: Actor,
  name: string,
  visibility: string,
): number {
  assertAllowed(permissions.editOwnData(actor, actor.userId));
  return db
    .insert(todoLists)
    .values({
      ownerId: actor.userId,
      name: requiredText(name, MAX_NAME, "einen Namen"),
      visibility: visibilityOf(visibility),
    })
    .returning()
    .get().id;
}

export function renameTodoList(
  db: AppDatabase,
  actor: Actor,
  listId: number,
  name: string,
): void {
  managedList(db, actor, listId);
  db.update(todoLists)
    .set({ name: requiredText(name, MAX_NAME, "einen Namen") })
    .where(eq(todoLists.id, listId))
    .run();
}

export function deleteTodoList(
  db: AppDatabase,
  actor: Actor,
  listId: number,
): void {
  managedList(db, actor, listId);
  db.delete(todoLists).where(eq(todoLists.id, listId)).run();
}

export function addTodoItem(
  db: AppDatabase,
  actor: Actor,
  listId: number,
  text: string,
): void {
  visibleList(db, actor, listId);
  db.insert(todoItems)
    .values({
      listId,
      text: requiredText(text, MAX_TEXT, "einen Eintrag"),
      createdBy: actor.userId,
    })
    .run();
}

export function setTodoItemDone(
  db: AppDatabase,
  actor: Actor,
  itemId: number,
  done: boolean,
  now: Date = new Date(),
): void {
  visibleItem(db, actor, itemId);
  db.update(todoItems)
    .set(
      done
        ? { doneAt: now, doneBy: actor.userId }
        : { doneAt: null, doneBy: null },
    )
    .where(eq(todoItems.id, itemId))
    .run();
}

/** Own entries may always go; other people's only by whoever manages the list. */
export function deleteTodoItem(
  db: AppDatabase,
  actor: Actor,
  itemId: number,
): void {
  const { item, list } = visibleItem(db, actor, itemId);
  if (item.createdBy !== actor.userId) {
    assertAllowed(permissions.editSharedEntry(actor, list));
  }
  db.delete(todoItems).where(eq(todoItems.id, itemId)).run();
}

/** Removes every finished entry of a list, including other members' ones. */
export function clearDoneItems(
  db: AppDatabase,
  actor: Actor,
  listId: number,
): void {
  managedList(db, actor, listId);
  db.delete(todoItems)
    .where(and(eq(todoItems.listId, listId), isNotNull(todoItems.doneAt)))
    .run();
}
