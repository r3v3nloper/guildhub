import { DateTime } from "luxon";
import { beforeEach, describe, expect, it } from "vitest";
import { taskDefinitions, taskProgress } from "@/lib/db/schema";
import { DomainError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { deleteCharacter } from "@/lib/roster/characters";
import { buildDashboard } from "./dashboard";
import {
  adjustCounter,
  consumeStacking,
  setBossKilled,
  setResourceValue,
  setTaskDone,
} from "./progress";
import { createTaskFixture, type TaskFixture } from "./test-setup";

const now = DateTime.fromISO("2026-10-27T12:00:00", { zone: "Europe/Berlin" });

describe("task progress", () => {
  let fixture: TaskFixture;
  let characterId: number;

  beforeEach(() => {
    fixture = createTaskFixture();
    characterId = fixture.createCharacter(
      fixture.actor.userId,
      "Aria",
      "Ariel",
    );
  });

  const dashboardAt = (at: DateTime) =>
    buildDashboard(
      fixture.db,
      fixture.actor.guildId,
      fixture.actor.userId,
      [fixture.gameInfo],
      at,
    );
  const questOf = (at: DateTime) =>
    dashboardAt(at).games[0].servers[0].characters[0].items.find(
      (item) => item.title === "Quest",
    )!;

  it("reopens a checked task after the next reset", () => {
    // Arrange
    const target = { taskId: fixture.taskId("quest"), characterId };

    // Act
    setTaskDone(fixture.db, fixture.actor, target, true, now);

    // Assert
    expect(questOf(now).status).toBe("done");
    expect(questOf(now.plus({ days: 1 })).status).toBe("open");
  });

  it("unchecks a task again", () => {
    // Arrange
    const target = { taskId: fixture.taskId("quest"), characterId };
    setTaskDone(fixture.db, fixture.actor, target, true, now);

    // Act
    setTaskDone(fixture.db, fixture.actor, target, false, now);

    // Assert
    expect(questOf(now).status).toBe("open");
  });

  it("refuses to change progress of someone else's character", () => {
    // Arrange
    const foreign = fixture.createCharacter(fixture.other.userId, "Lux");

    // Act & Assert
    expect(() =>
      setTaskDone(
        fixture.db,
        fixture.actor,
        { taskId: fixture.taskId("quest"), characterId: foreign },
        true,
        now,
      ),
    ).toThrow(ForbiddenError);
  });

  it("keeps a counter between zero and its cap", () => {
    // Arrange
    const target = { taskId: fixture.taskId("duty"), characterId };

    // Act
    adjustCounter(fixture.db, fixture.actor, target, -1, now);
    for (let i = 0; i < 5; i++) {
      adjustCounter(fixture.db, fixture.actor, target, 1, now);
    }

    // Assert
    const duty = dashboardAt(now).games[0].servers[0].items[0];
    expect(duty).toMatchObject({ value: 3, status: "done" });
  });

  it("shares a server task between characters on the same server", () => {
    // Arrange
    const twin = fixture.createCharacter(fixture.actor.userId, "Bria", "Ariel");
    adjustCounter(
      fixture.db,
      fixture.actor,
      { taskId: fixture.taskId("duty"), characterId },
      1,
      now,
    );

    // Act
    adjustCounter(
      fixture.db,
      fixture.actor,
      { taskId: fixture.taskId("duty"), characterId: twin },
      1,
      now,
    );

    // Assert
    expect(fixture.db.select().from(taskProgress).all()).toEqual([
      expect.objectContaining({
        value: 2,
        scopeKey: expect.stringMatching(/^s:/),
      }),
    ]);
  });

  it("completes a lockout once every boss is down", () => {
    // Arrange
    const target = { taskId: fixture.taskId("raid"), characterId };

    // Act
    setBossKilled(fixture.db, fixture.actor, target, "a", true, now);
    setBossKilled(fixture.db, fixture.actor, target, "b", true, now);
    setBossKilled(fixture.db, fixture.actor, target, "b", false, now);
    setBossKilled(fixture.db, fixture.actor, target, "b", true, now);

    // Assert
    const raid = dashboardAt(now).games[0].servers[0].characters[0].items.find(
      (item) => item.title === "Raid",
    )!;
    expect(raid.status).toBe("done");
    expect(raid.bosses).toEqual([
      { key: "a", name: "Boss A", killed: true },
      { key: "b", name: "Boss B", killed: true },
    ]);
  });

  it("uses one stacking entry from the projected value", () => {
    // Arrange
    const target = { taskId: fixture.taskId("tickets"), characterId: null };
    setResourceValue(fixture.db, fixture.actor, target, 2, now);

    // Act: one reset later the value is 4, minus one used
    consumeStacking(fixture.db, fixture.actor, target, now.plus({ days: 1 }));

    // Assert
    const tickets = dashboardAt(now.plus({ days: 1 })).games[0].items[0];
    expect(tickets.resource?.value).toBe(3);
  });

  it("asks for a value before a stacking entry can be used", () => {
    // Act & Assert
    expect(() =>
      consumeStacking(
        fixture.db,
        fixture.actor,
        { taskId: fixture.taskId("tickets"), characterId: null },
        now,
      ),
    ).toThrow(DomainError);
  });

  it("rejects a resource value above the cap", () => {
    // Act & Assert
    expect(() =>
      setResourceValue(
        fixture.db,
        fixture.actor,
        { taskId: fixture.taskId("energy"), characterId },
        101,
        now,
      ),
    ).toThrow(DomainError);
  });

  it("hides private tasks of other users", () => {
    // Arrange
    const foreignTask = fixture.db
      .insert(taskDefinitions)
      .values({
        source: "private",
        ownerId: fixture.other.userId,
        title: "Geheim",
        kind: "one_time",
        scope: "user",
        tags: [],
      })
      .returning()
      .get();

    // Act & Assert
    expect(() =>
      setTaskDone(
        fixture.db,
        fixture.actor,
        { taskId: foreignTask.id, characterId: null },
        true,
        now,
      ),
    ).toThrow(NotFoundError);
  });

  it("deletes a character's progress together with the character", () => {
    // Arrange
    setTaskDone(
      fixture.db,
      fixture.actor,
      { taskId: fixture.taskId("quest"), characterId },
      true,
      now,
    );

    // Act
    deleteCharacter(fixture.db, fixture.actor, characterId);

    // Assert
    expect(fixture.db.select().from(taskProgress).all()).toEqual([]);
  });
});
