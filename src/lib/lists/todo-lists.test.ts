import { beforeEach, describe, expect, it } from "vitest";
import { DomainError, NotFoundError } from "@/lib/errors";
import { createListFixture, type ListFixture } from "./test-setup";
import {
  addTodoItem,
  clearDoneItems,
  createTodoList,
  listTodoLists,
  setTodoItemDone,
} from "./todo-lists";

describe("to-do lists", () => {
  let fixture: ListFixture;

  beforeEach(() => {
    fixture = createListFixture();
  });

  it("keeps items until they are cleared after being done", () => {
    // Arrange
    const { db, member } = fixture;
    const listId = createTodoList(db, member, "Vor dem Raid");
    addTodoItem(db, member, listId, "Tränke kaufen");
    addTodoItem(db, member, listId, "Reparieren");
    const [potions] = listTodoLists(db, member.userId)[0].items;

    // Act
    setTodoItemDone(db, member, potions.id, true);
    clearDoneItems(db, member, listId);

    // Assert
    expect(
      listTodoLists(db, member.userId)[0].items.map((item) => item.text),
    ).toEqual(["Reparieren"]);
  });

  it("hides lists of other members and refuses changes to them", () => {
    // Arrange
    const { db, member, other } = fixture;
    const listId = createTodoList(db, member, "Privat");

    // Act & Assert
    expect(listTodoLists(db, other.userId)).toEqual([]);
    expect(() => addTodoItem(db, other, listId, "Fremd")).toThrow(
      NotFoundError,
    );
  });

  it("rejects an empty entry", () => {
    // Arrange
    const { db, member } = fixture;
    const listId = createTodoList(db, member, "Liste");

    // Act & Assert
    expect(() => addTodoItem(db, member, listId, "   ")).toThrow(DomainError);
  });
});
