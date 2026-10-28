import { eq } from "drizzle-orm";
import { DateTime } from "luxon";
import { beforeEach, describe, expect, it } from "vitest";
import { guildMembers, taskDefinitions } from "@/lib/db/schema";
import {
  adjustCounter,
  setBossKilled,
  setResourceValue,
  setTaskDone,
} from "@/lib/tasks/progress";
import {
  createTaskFixture,
  type TaskFixture,
} from "../../../test/fixtures/tasks";
import { buildGameMatrix, type GameMatrix } from "./matrix";

const now = DateTime.fromISO("2026-10-27T12:00:00", { zone: "Europe/Berlin" });

describe("buildGameMatrix", () => {
  let fixture: TaskFixture;
  let aria: number;
  let bria: number;

  beforeEach(() => {
    fixture = createTaskFixture();
    aria = fixture.createCharacter(fixture.actor.userId, "Aria", "Ariel");
    bria = fixture.createCharacter(fixture.actor.userId, "Bria", "Ariel");
    fixture.createCharacter(fixture.other.userId, "Lux");
  });

  const matrix = (mode: "member" | "character") =>
    buildGameMatrix(
      fixture.db,
      fixture.actor.guildId,
      "game",
      mode,
      undefined,
      now,
    );
  const cell = (result: GameMatrix, title: string, column: string) => {
    const index = result.columns.findIndex((col) => col.label === column);
    return result.rows.find((row) => row.title === title)!.cells[index];
  };

  it("summarises character tasks per member as done of total", () => {
    // Arrange
    setTaskDone(
      fixture.db,
      fixture.actor,
      { taskId: fixture.taskId("quest"), characterId: aria },
      true,
      now,
    );

    // Act
    const result = matrix("member");

    // Assert
    expect(result.columns.map((column) => column.label)).toEqual([
      "Erik",
      "Lena",
    ]);
    expect(cell(result, "Quest", "Erik")).toEqual({
      text: "1/2",
      done: false,
      detail: "Aria: ✓, Bria: –",
    });
  });

  it("shows a server task on one server directly", () => {
    // Arrange
    adjustCounter(
      fixture.db,
      fixture.actor,
      { taskId: fixture.taskId("duty"), characterId: bria },
      1,
      now,
    );

    // Act
    const byMember = matrix("member");
    const byCharacter = matrix("character");

    // Assert
    expect(cell(byMember, "Duty", "Erik")).toEqual({
      text: "1/3",
      done: false,
    });
    expect(cell(byCharacter, "Duty", "Aria")).toEqual({
      text: "1/3",
      done: false,
      shared: true,
    });
  });

  it("shows lockouts as free, partial and full", () => {
    // Arrange
    const raid = { taskId: fixture.taskId("raid"), characterId: aria };
    setBossKilled(fixture.db, fixture.actor, raid, "a", true, now);

    // Act & Assert
    expect(cell(matrix("character"), "Raid", "Aria").text).toBe("1/2");
    expect(cell(matrix("character"), "Raid", "Bria").text).toBe("frei");
    setBossKilled(fixture.db, fixture.actor, raid, "b", true, now);
    expect(cell(matrix("character"), "Raid", "Aria")).toMatchObject({
      text: "voll",
      done: true,
    });
  });

  it("shows resources only once a value is known", () => {
    // Arrange
    setResourceValue(
      fixture.db,
      fixture.actor,
      { taskId: fixture.taskId("energy"), characterId: aria },
      40,
      now,
    );

    // Act
    const result = matrix("character");

    // Assert
    expect(cell(result, "Energie", "Aria")).toMatchObject({
      text: "40/100",
      done: null,
    });
    expect(cell(result, "Energie", "Bria").text).toBe("");
  });

  it("leaves out private tasks and disabled members", () => {
    // Arrange
    fixture.db
      .insert(taskDefinitions)
      .values({
        gameId: "game",
        source: "private",
        ownerId: fixture.actor.userId,
        title: "Geheim",
        kind: "one_time",
        scope: "character",
        tags: [],
      })
      .run();
    fixture.db
      .update(guildMembers)
      .set({ status: "disabled" })
      .where(eq(guildMembers.userId, fixture.other.userId))
      .run();

    // Act
    const result = matrix("member");

    // Assert
    expect(result.rows.map((row) => row.title)).not.toContain("Geheim");
    expect(result.columns.map((column) => column.label)).toEqual(["Erik"]);
  });
});
