import { beforeEach, describe, expect, it } from "vitest";
import { listAudit } from "@/lib/audit/audit";
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
  createStatPriority,
  updateStatPriority,
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
    const result = createStatPriority(
      fixture.db,
      fixture.officer,
      classEntryId,
      input,
    );

    // Assert
    expect(result).toEqual({ ok: true });
    expect(listAudit(fixture.db)).toEqual([
      expect.objectContaining({ action: "statPriority.create", target: "PvE" }),
    ]);
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
      createStatPriority(fixture.db, fixture.actor, classEntryId, input),
    ).toThrow(ForbiddenError);
  });

  it("validates title, stats and source", () => {
    // Act
    const result = createStatPriority(
      fixture.db,
      fixture.officer,
      classEntryId,
      { title: "", stats: " ", notes: "", source: "javascript:alert(1)" },
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
    createStatPriority(fixture.db, fixture.officer, classEntryId, input);
    const [priority] = listStatPriorities(fixture.db, ["game"])[0].priorities;

    // Act
    updateStatPriority(fixture.db, fixture.officer, priority.id, {
      ...input,
      title: "PvP",
    });
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
