import { DateTime } from "luxon";
import { beforeEach, describe, expect, it } from "vitest";
import { taskDefinitions } from "@/lib/db/schema";
import { buildDashboard } from "./dashboard";
import { setResourceValue } from "./progress";
import { createTaskFixture, type TaskFixture } from "./test-setup";

const now = DateTime.fromISO("2026-10-27T12:00:00", { zone: "Europe/Berlin" });

describe("buildDashboard", () => {
  let fixture: TaskFixture;

  beforeEach(() => {
    fixture = createTaskFixture();
  });

  const build = (at: DateTime = now) =>
    buildDashboard(
      fixture.db,
      fixture.actor.guildId,
      fixture.actor.userId,
      [fixture.gameInfo],
      at,
    );

  it("shows server and account tasks once above the characters", () => {
    // Arrange
    fixture.createCharacter(fixture.actor.userId, "Aria", "Ariel");
    fixture.createCharacter(fixture.actor.userId, "Bria", "Ariel");
    fixture.createCharacter(fixture.actor.userId, "Cira", "Azphel");

    // Act
    const game = build().games[0];

    // Assert
    expect(game.items.map((item) => item.title)).toEqual(["Tickets"]);
    expect(
      game.servers.map((server) => ({
        name: server.name,
        tasks: server.items.map((item) => item.title),
        characters: server.characters.map((character) => character.name),
      })),
    ).toEqual([
      { name: "Ariel", tasks: ["Duty"], characters: ["Aria", "Bria"] },
      { name: "Azphel", tasks: ["Duty"], characters: ["Cira"] },
    ]);
    expect(
      game.servers[0].characters[0].items.map((item) => item.title),
    ).toEqual(["Energie", "Quest", "Raid"]);
  });

  it("leaves out games without own characters", () => {
    // Act
    const dashboard = build();

    // Assert
    expect(dashboard.games).toEqual([]);
  });

  it("counts a resource as open only once it reaches its cap", () => {
    // Arrange
    const characterId = fixture.createCharacter(fixture.actor.userId, "Aria");
    const target = { taskId: fixture.taskId("energy"), characterId };
    const energy = (at: DateTime) =>
      build(at).games[0].servers[0].characters[0].items.find(
        (item) => item.title === "Energie",
      )!;

    // Act & Assert
    expect(energy(now)).toMatchObject({
      status: "info",
      resource: { value: null },
    });
    setResourceValue(fixture.db, fixture.actor, target, 90, now);
    expect(energy(now)).toMatchObject({
      status: "info",
      resource: { value: 90, cap: 100 },
    });
    expect(energy(now.plus({ hours: 1 }))).toMatchObject({
      status: "open",
      resource: { value: 100, fullAt: null },
    });
  });

  it("puts cross-game private tasks into the general block", () => {
    // Arrange
    fixture.db
      .insert(taskDefinitions)
      .values({
        source: "private",
        ownerId: fixture.actor.userId,
        title: "Raid-Termin eintragen",
        kind: "one_time",
        scope: "user",
        tags: [],
      })
      .run();

    // Act
    const dashboard = build();

    // Assert
    expect(dashboard.general).toEqual([
      expect.objectContaining({
        title: "Raid-Termin eintragen",
        status: "open",
        nextReset: null,
      }),
    ]);
    expect(dashboard.openCount).toBe(1);
  });
});
