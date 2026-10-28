import { beforeEach, describe, expect, it } from "vitest";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import {
  createTaskFixture,
  type TaskFixture,
} from "../../../test/fixtures/tasks";
import { syncPack } from "@/lib/packs/sync";
import { validatePack } from "@/lib/packs/validate";
import {
  deleteStatPriority,
  listStatPriorities,
  saveStatPriority,
  type StatPriorityInput,
} from "./stat-priorities";

const input: StatPriorityInput = {
  title: "PvE",
  stats: "Stärke\n\nKritische Trefferchance\nTempo\n",
  notes: "",
  source: "https://example.org/guide",
};

const classPack = {
  id: "game",
  name: "Spiel",
  version: "2.0.0",
  capabilities: { classes: true },
  classes: [{ id: "warrior", name: "Krieger", role: "tank" }],
};

describe("stat priorities", () => {
  let fixture: TaskFixture;
  let classEntryId: number;

  beforeEach(() => {
    fixture = createTaskFixture();
    syncPack(fixture.db, {
      folderName: "game",
      file: "packs/game/pack.json",
      content: JSON.stringify(classPack),
      ...validatePack(classPack, "game"),
    });
    classEntryId = listStatPriorities(fixture.db, ["game"])[0].classEntryId;
  });

  it("lets officers keep ordered stats per class", () => {
    // Act
    const result = saveStatPriority(fixture.db, fixture.officer, input, {
      classEntryId,
    });

    // Assert
    expect(result).toEqual({ ok: true });
    expect(listStatPriorities(fixture.db, ["game"])).toEqual([
      expect.objectContaining({
        className: "Krieger",
        role: "tank",
        priorities: [
          expect.objectContaining({
            title: "PvE",
            stats: ["Stärke", "Kritische Trefferchance", "Tempo"],
          }),
        ],
      }),
    ]);
  });

  it("keeps members from editing", () => {
    // Act & Assert
    expect(() =>
      saveStatPriority(fixture.db, fixture.actor, input, { classEntryId }),
    ).toThrow(ForbiddenError);
  });

  it("validates title, stats and source", () => {
    // Act
    const result = saveStatPriority(
      fixture.db,
      fixture.officer,
      { title: "", stats: " ", notes: "", source: "javascript:alert(1)" },
      { classEntryId },
    );

    // Assert
    expect(result).toEqual({
      ok: false,
      errors: {
        title: expect.any(String),
        stats: expect.any(String),
        source: expect.any(String),
      },
    });
  });

  it("updates and deletes a ranking", () => {
    // Arrange
    saveStatPriority(fixture.db, fixture.officer, input, { classEntryId });
    const [priority] = listStatPriorities(fixture.db, ["game"])[0].priorities;

    // Act
    saveStatPriority(
      fixture.db,
      fixture.officer,
      { ...input, title: "PvP" },
      { priorityId: priority.id },
    );
    const renamed = listStatPriorities(fixture.db, ["game"])[0].priorities[0];
    deleteStatPriority(fixture.db, fixture.officer, priority.id);

    // Assert
    expect(renamed.title).toBe("PvP");
    expect(listStatPriorities(fixture.db, ["game"])[0].priorities).toEqual([]);
    expect(() =>
      deleteStatPriority(fixture.db, fixture.officer, priority.id),
    ).toThrow(NotFoundError);
  });
});
