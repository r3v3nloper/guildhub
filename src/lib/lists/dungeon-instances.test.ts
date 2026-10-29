import { describe, expect, it } from "vitest";
import {
  createListFixture,
  type ListFixture,
} from "../../../test/fixtures/lists";
import { getChecklist, saveChecklist, type ChecklistInput } from "./checklists";
import { listBosses } from "./dungeon-bosses";
import { instancesById, notableLootOf } from "./dungeon-instances";

const blank: ChecklistInput = {
  name: "",
  gameId: "game",
  visibility: "guild",
  items: "",
  notes: "",
  instanceKey: "",
};

function create(fixture: ListFixture, input: Partial<ChecklistInput>) {
  return saveChecklist(fixture.db, fixture.member, { ...blank, ...input });
}

describe("dungeon pages from a pack instance", () => {
  it("takes over the bosses and ticks one point per boss when none are given", () => {
    // Arrange
    const fixture = createListFixture();

    // Act
    const result = create(fixture, {
      name: "Todesminen",
      instanceKey: "deadmines",
    });

    // Assert
    const id = result.ok ? result.checklistId : -1;
    const checklist = getChecklist(fixture.db, fixture.member, id);
    expect(checklist.name).toBe("Todesminen");
    expect(checklist.items.map((item) => item.label)).toEqual([
      "Rhahk'Zor",
      "Edwin VanCleef",
    ]);
    expect(listBosses(fixture.db, id).map((boss) => boss.name)).toEqual([
      "Rhahk'Zor",
      "Edwin VanCleef",
    ]);
    expect(notableLootOf(fixture.db, checklist.instanceEntryId)).toEqual([
      { name: "Cape of the Brotherhood", reason: "top pick for rogues" },
    ]);
    expect(
      instancesById(fixture.db, [checklist.instanceEntryId, null]).get(
        checklist.instanceEntryId!,
      ),
    ).toMatchObject({
      kind: "dungeon",
      players: 5,
      levelMin: 17,
      levelMax: 26,
    });
  });

  it("keeps the page's own points", () => {
    // Arrange
    const fixture = createListFixture();

    // Act
    const result = create(fixture, {
      name: "Todesminen",
      instanceKey: "deadmines",
      items: "Gruppe sammeln",
    });

    // Assert
    const id = result.ok ? result.checklistId : -1;
    expect(
      getChecklist(fixture.db, fixture.member, id).items.map((i) => i.label),
    ).toEqual(["Gruppe sammeln"]);
  });

  it("rejects an unknown instance", () => {
    // Arrange
    const fixture = createListFixture();

    // Act
    const result = create(fixture, { name: "X", instanceKey: "atlantis" });

    // Assert
    expect(result).toMatchObject({
      ok: false,
      errors: { instanceKey: "Bitte eine Instanz aus der Liste wählen." },
    });
  });

  it("shows no notable loot for pages without an instance", () => {
    // Arrange
    const fixture = createListFixture();

    // Act & Assert
    expect(notableLootOf(fixture.db, null)).toEqual([]);
  });
});
