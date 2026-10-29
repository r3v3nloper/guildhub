import { beforeEach, describe, expect, it } from "vitest";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import {
  createListFixture,
  type ListFixture,
} from "../../../test/fixtures/lists";
import {
  getChecklist,
  saveChecklist,
  setChecklistItemTicked,
  type ChecklistInput,
} from "./checklists";
import { deleteBoss, listBosses, saveBoss } from "./dungeon-bosses";

const checklist: ChecklistInput = {
  name: "Feuerschlund",
  gameId: "game",
  visibility: "guild",
  items: "Feuerschutztränke\nWasser",
  notes: "",
  instanceKey: "",
};

describe("dungeon bosses", () => {
  let fixture: ListFixture;
  let checklistId: number;

  beforeEach(() => {
    fixture = createListFixture();
    const result = saveChecklist(fixture.db, fixture.member, checklist);
    checklistId = result.ok ? result.checklistId : -1;
  });

  it("keeps bosses with mechanics and loot in the order added", () => {
    // Act
    saveBoss(fixture.db, fixture.member, checklistId, {
      name: "Lucifron",
      mechanics: "Fluch sofort entfernen.",
      loot: "Feuerstab – für Magier – https://example.org/1\nRobe",
    });
    saveBoss(fixture.db, fixture.member, checklistId, {
      name: "Magmadar",
      mechanics: "",
      loot: "",
    });

    // Assert
    expect(listBosses(fixture.db, checklistId)).toEqual([
      expect.objectContaining({
        name: "Lucifron",
        mechanics: "Fluch sofort entfernen.",
        loot: [
          expect.objectContaining({
            name: "Feuerstab",
            notes: "für Magier",
            link: "https://example.org/1",
          }),
          expect.objectContaining({ name: "Robe", notes: null, link: null }),
        ],
      }),
      expect.objectContaining({ name: "Magmadar", mechanics: null, loot: [] }),
    ]);
  });

  it("replaces the loot when a boss is edited and deletes it with the boss", () => {
    // Arrange
    saveBoss(fixture.db, fixture.member, checklistId, {
      name: "Lucifron",
      mechanics: "",
      loot: "Feuerstab\nRobe",
    });
    const [boss] = listBosses(fixture.db, checklistId);

    // Act
    saveBoss(
      fixture.db,
      fixture.member,
      checklistId,
      { name: "Lucifron", mechanics: "", loot: "Helm" },
      boss.id,
    );
    const edited = listBosses(fixture.db, checklistId)[0].loot;
    deleteBoss(fixture.db, fixture.member, checklistId, boss.id);

    // Assert
    expect(edited.map((entry) => entry.name)).toEqual(["Helm"]);
    expect(listBosses(fixture.db, checklistId)).toEqual([]);
  });

  it("leaves editing to the author and officers", () => {
    // Arrange
    const input = { name: "Lucifron", mechanics: "", loot: "" };

    // Act & Assert
    expect(() =>
      saveBoss(fixture.db, fixture.other, checklistId, input),
    ).toThrow(ForbiddenError);
    expect(saveBoss(fixture.db, fixture.officer, checklistId, input)).toEqual({
      ok: true,
    });
  });

  it("refuses a boss of another checklist", () => {
    // Arrange
    const otherList = saveChecklist(fixture.db, fixture.member, {
      ...checklist,
      name: "Schwarzfels",
    });
    const otherId = otherList.ok ? otherList.checklistId : -1;
    saveBoss(fixture.db, fixture.member, otherId, {
      name: "Drakkisath",
      mechanics: "",
      loot: "",
    });
    const [foreignBoss] = listBosses(fixture.db, otherId);

    // Act & Assert
    expect(() =>
      deleteBoss(fixture.db, fixture.member, checklistId, foreignBoss.id),
    ).toThrow(NotFoundError);
  });

  it("validates name and loot", () => {
    // Act
    const result = saveBoss(fixture.db, fixture.member, checklistId, {
      name: " ",
      mechanics: "",
      loot: "https://example.org/nur-ein-link",
    });

    // Assert
    expect(result).toEqual({
      ok: false,
      errors: { name: expect.any(String), loot: expect.any(String) },
    });
  });
});

describe("checklist notes", () => {
  it("keeps everyone's ticks when only name or notes change", () => {
    // Arrange
    const fixture = createListFixture();
    const created = saveChecklist(fixture.db, fixture.member, checklist);
    const id = created.ok ? created.checklistId : -1;
    const [first] = getChecklist(fixture.db, fixture.other, id).items;
    setChecklistItemTicked(fixture.db, fixture.other, first.id, true);

    // Act
    saveChecklist(
      fixture.db,
      fixture.member,
      { ...checklist, notes: "Erst links, dann rechts." },
      id,
    );

    // Assert
    const view = getChecklist(fixture.db, fixture.other, id);
    expect(view.notes).toBe("Erst links, dann rechts.");
    expect(view.items[0].ticked).toBe(true);
  });
});
