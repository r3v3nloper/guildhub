import { beforeEach, describe, expect, it } from "vitest";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import {
  deleteChecklist,
  listChecklists,
  listPinnedChecklists,
  resetChecklistRun,
  saveChecklist,
  setChecklistItemTicked,
  setChecklistPinned,
  type ChecklistInput,
} from "./checklists";
import {
  createListFixture,
  type ListFixture,
} from "../../../test/fixtures/lists";

const input: ChecklistInput = {
  name: "Feuerschlund",
  gameId: "game",
  visibility: "guild",
  items: "Feuerschutztränke\n\nWasser einpacken\n",
  notes: "",
  instanceKey: "",
};

describe("dungeon checklists", () => {
  let fixture: ListFixture;

  beforeEach(() => {
    fixture = createListFixture();
  });

  function create(overrides: Partial<ChecklistInput> = {}) {
    const result = saveChecklist(fixture.db, fixture.member, {
      ...input,
      ...overrides,
    });
    if (!result.ok) {
      throw new Error(JSON.stringify(result.errors));
    }
    return result.checklistId;
  }

  it("lets every member tick a shared checklist for their own run", () => {
    // Arrange
    const { db, member, other } = fixture;
    create();
    const [first] = listChecklists(db, other, ["game"])[0].items;

    // Act
    setChecklistItemTicked(db, other, first.id, true);

    // Assert
    expect(
      listChecklists(db, other, ["game"])[0].items.map((item) => item.ticked),
    ).toEqual([true, false]);
    expect(
      listChecklists(db, member, ["game"])[0].items.map((item) => item.ticked),
    ).toEqual([false, false]);
  });

  it("clears only the actor's ticks when a new run starts", () => {
    // Arrange
    const { db, member, other } = fixture;
    const checklistId = create();
    const [first] = listChecklists(db, member, ["game"])[0].items;
    setChecklistItemTicked(db, member, first.id, true);
    setChecklistItemTicked(db, other, first.id, true);

    // Act
    resetChecklistRun(db, member, checklistId);

    // Assert
    expect(listChecklists(db, member, ["game"])[0].items[0].ticked).toBe(false);
    expect(listChecklists(db, other, ["game"])[0].items[0].ticked).toBe(true);
  });

  it("keeps private checklists to their author", () => {
    // Arrange
    const { db, other } = fixture;
    const checklistId = create({ visibility: "private" });

    // Act & Assert
    expect(listChecklists(db, other, ["game"])).toEqual([]);
    expect(() => deleteChecklist(db, other, checklistId)).toThrow(
      NotFoundError,
    );
  });

  it("lets officers but not other members edit a shared checklist", () => {
    // Arrange
    const { db, other, officer } = fixture;
    const checklistId = create();

    // Act & Assert
    expect(() => deleteChecklist(db, other, checklistId)).toThrow(
      ForbiddenError,
    );
    deleteChecklist(db, officer, checklistId);
    expect(listChecklists(db, officer, ["game"])).toEqual([]);
  });

  it("requires at least one point", () => {
    // Act
    const result = saveChecklist(fixture.db, fixture.member, {
      ...input,
      items: " \n ",
    });

    // Assert
    expect(result).toMatchObject({
      ok: false,
      errors: { items: expect.any(String) },
    });
  });

  it("pins a checklist to the dashboard for the actor only", () => {
    // Arrange
    const { db, member, other } = fixture;
    const checklistId = create();
    create({ name: "Schwarzfels" });

    // Act
    setChecklistPinned(db, other, checklistId, true);

    // Assert
    expect(
      listPinnedChecklists(db, other, ["game"]).map((list) => list.name),
    ).toEqual(["Feuerschlund"]);
    expect(listPinnedChecklists(db, member, ["game"])).toEqual([]);
  });

  it("unpins again and refuses private checklists of others", () => {
    // Arrange
    const { db, other } = fixture;
    const shared = create();
    const hidden = create({ name: "Privat", visibility: "private" });
    setChecklistPinned(db, other, shared, true);

    // Act
    setChecklistPinned(db, other, shared, false);

    // Assert
    expect(listPinnedChecklists(db, other, ["game"])).toEqual([]);
    expect(() => setChecklistPinned(db, other, hidden, true)).toThrow(
      NotFoundError,
    );
  });
});
