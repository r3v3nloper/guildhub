import { beforeEach, describe, expect, it } from "vitest";
import { DomainError, ForbiddenError, NotFoundError } from "@/lib/errors";
import {
  createListFixture,
  type ListFixture,
} from "../../../test/fixtures/lists";
import {
  addTodoItem,
  clearDoneItems,
  createTodoList,
  deleteTodoItem,
  deleteTodoList,
  listTodoLists,
  renameTodoList,
  setTodoItemDone,
} from "./todo-lists";

describe("to-do lists", () => {
  let fixture: ListFixture;

  beforeEach(() => {
    fixture = createListFixture();
  });

  const itemsOf = (actor = fixture.member) =>
    listTodoLists(fixture.db, actor)[0].items;

  it("keeps items until they are cleared after being done", () => {
    // Arrange
    const { db, member } = fixture;
    const listId = createTodoList(db, member, "Vor dem Raid", "private");
    addTodoItem(db, member, listId, "Tränke kaufen");
    addTodoItem(db, member, listId, "Reparieren");
    const [potions] = itemsOf();

    // Act
    setTodoItemDone(db, member, potions.id, true);
    clearDoneItems(db, member, listId);

    // Assert
    expect(itemsOf().map((item) => item.text)).toEqual(["Reparieren"]);
  });

  it("hides private lists of other members and refuses changes to them", () => {
    // Arrange
    const { db, member, other } = fixture;
    const listId = createTodoList(db, member, "Privat", "private");

    // Act & Assert
    expect(listTodoLists(db, other)).toEqual([]);
    expect(() => addTodoItem(db, other, listId, "Fremd")).toThrow(
      NotFoundError,
    );
  });

  it("lets every member add and tick on a guild list, done for everyone", () => {
    // Arrange
    const { db, member, other } = fixture;
    const listId = createTodoList(db, member, "Gildenbank", "guild");

    // Act
    addTodoItem(db, other, listId, "Kräuter einlagern");
    setTodoItemDone(db, other, itemsOf(other)[0].id, true);

    // Assert
    expect(itemsOf(member)).toEqual([
      expect.objectContaining({
        text: "Kräuter einlagern",
        doneBy: other.userId,
        canDelete: true,
      }),
    ]);
  });

  it("leaves managing a guild list to its author and officers", () => {
    // Arrange
    const { db, member, other, officer } = fixture;
    const listId = createTodoList(db, member, "Gildenbank", "guild");
    addTodoItem(db, member, listId, "Erz einlagern");
    const [entry] = itemsOf();

    // Act & Assert
    expect(() => renameTodoList(db, other, listId, "Meins")).toThrow(
      ForbiddenError,
    );
    expect(() => deleteTodoItem(db, other, entry.id)).toThrow(ForbiddenError);
    expect(() => clearDoneItems(db, other, listId)).toThrow(ForbiddenError);
    renameTodoList(db, officer, listId, "Bank");
    deleteTodoItem(db, officer, entry.id);
    deleteTodoList(db, officer, listId);
    expect(listTodoLists(db, member)).toEqual([]);
  });

  it("lets members delete their own entries on a guild list", () => {
    // Arrange
    const { db, member, other } = fixture;
    const listId = createTodoList(db, member, "Gildenbank", "guild");
    addTodoItem(db, other, listId, "Eigener Eintrag");

    // Act
    deleteTodoItem(db, other, itemsOf(other)[0].id);

    // Assert
    expect(itemsOf()).toEqual([]);
  });

  it("rejects an empty entry and an unknown visibility", () => {
    // Arrange
    const { db, member } = fixture;
    const listId = createTodoList(db, member, "Liste", "private");

    // Act & Assert
    expect(() => addTodoItem(db, member, listId, "   ")).toThrow(DomainError);
    expect(() => createTodoList(db, member, "Liste", "public")).toThrow(
      DomainError,
    );
  });
});
