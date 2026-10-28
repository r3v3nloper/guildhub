import { DateTime } from "luxon";
import { beforeEach, describe, expect, it } from "vitest";
import { NotFoundError } from "@/lib/errors";
import {
  deleteCustomTask,
  listOwnTasks,
  saveCustomTask,
  type CustomTaskInput,
} from "./custom-tasks";
import { buildDashboard } from "./dashboard";
import { setTaskDone } from "./progress";
import { CUSTOM_RULE, NO_RULE } from "./rule-choices";
import { createTaskFixture, type TaskFixture } from "./test-setup";

const now = DateTime.fromISO("2026-10-27T12:00:00", { zone: "Europe/Berlin" });

const base: CustomTaskInput = {
  title: "Gildenbank auffüllen",
  gameId: "game",
  kind: "recurring",
  scope: "character",
  category: "",
  link: "",
  rule: "daily",
  ruleType: "",
  ruleTime: "",
  ruleWeekday: null,
  ruleDayOfMonth: null,
  ruleNDays: null,
  ruleAnchor: "",
  cap: null,
  alertAt: null,
  regenAmount: null,
  regenIntervalMinutes: null,
  regenAlignment: "",
  perPeriodGain: null,
};

describe("custom tasks", () => {
  let fixture: TaskFixture;

  beforeEach(() => {
    fixture = createTaskFixture();
  });

  function save(input: Partial<CustomTaskInput>, taskId?: number) {
    return saveCustomTask(
      fixture.db,
      fixture.actor,
      { ...base, ...input },
      taskId,
    );
  }

  it("creates a cross-game task with its own weekly rule", () => {
    // Act
    const result = save({
      gameId: "",
      scope: "user",
      rule: CUSTOM_RULE,
      ruleType: "weekly",
      ruleTime: "20:00",
      ruleWeekday: 3,
    });

    // Assert
    expect(result.ok).toBe(true);
    const dashboard = buildDashboard(
      fixture.db,
      fixture.actor.guildId,
      fixture.actor.userId,
      [],
      now,
    );
    expect(dashboard.general).toEqual([
      expect.objectContaining({
        title: "Gildenbank auffüllen",
        nextReset: "2026-10-28T20:00:00.000+01:00",
      }),
    ]);
  });

  it("uses a pack rule of the game", () => {
    // Arrange
    fixture.createCharacter(fixture.actor.userId, "Aria");

    // Act
    save({});

    // Assert
    const items = buildDashboard(
      fixture.db,
      fixture.actor.guildId,
      fixture.actor.userId,
      [fixture.gameInfo],
      now,
    ).games[0].servers[0].characters[0].items;
    expect(items.map((item) => item.title)).toContain("Gildenbank auffüllen");
  });

  it("requires the fields of the chosen kind and rule", () => {
    // Act
    const counter = save({ kind: "counter", rule: NO_RULE });
    const weekly = save({
      rule: CUSTOM_RULE,
      ruleType: "weekly",
      ruleTime: "05:00",
    });

    // Assert
    expect(counter).toEqual({ ok: false, errors: { cap: expect.any(String) } });
    expect(weekly).toEqual({
      ok: false,
      errors: { ruleWeekday: expect.any(String) },
    });
  });

  it("rejects a scope that does not fit the game", () => {
    // Act
    const result = save({ scope: "user" });

    // Assert
    expect(result).toMatchObject({
      ok: false,
      errors: { scope: expect.any(String) },
    });
  });

  it("keeps game, kind and scope when editing", () => {
    // Arrange
    const created = save({});
    const taskId = created.ok ? created.taskId : -1;

    // Act
    save({ title: "Neu", kind: "counter", cap: 3, scope: "account" }, taskId);

    // Assert
    expect(listOwnTasks(fixture.db, fixture.actor.userId)).toEqual([
      expect.objectContaining({
        title: "Neu",
        kind: "recurring",
        scope: "character",
      }),
    ]);
  });

  it("deletes a task with its progress and protects it from others", () => {
    // Arrange
    const characterId = fixture.createCharacter(fixture.actor.userId, "Aria");
    const created = save({});
    const taskId = created.ok ? created.taskId : -1;
    setTaskDone(fixture.db, fixture.actor, { taskId, characterId }, true, now);

    // Act & Assert
    expect(() => deleteCustomTask(fixture.db, fixture.other, taskId)).toThrow(
      NotFoundError,
    );
    deleteCustomTask(fixture.db, fixture.actor, taskId);
    expect(listOwnTasks(fixture.db, fixture.actor.userId)).toEqual([]);
  });
});
