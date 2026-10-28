import { describe, expect, it } from "vitest";
import type { Dashboard, DashboardItem } from "./dashboard";
import { summarizeDashboard } from "./dashboard-summary";

let nextId = 1;

function item(overrides: Partial<DashboardItem>): DashboardItem {
  return {
    taskId: nextId++,
    characterId: null,
    title: "Aufgabe",
    category: null,
    link: null,
    todo: false,
    kind: "recurring",
    status: "open",
    value: 0,
    cap: null,
    bosses: [],
    resource: null,
    nextReset: null,
    doneBy: null,
    ...overrides,
  };
}

function dashboardWith(characterItems: DashboardItem[]): Dashboard {
  return {
    general: [item({ title: "Raid-Anmeldung", status: "done" })],
    guild: [],
    openCount: 0,
    games: [
      {
        id: "game",
        name: "Spiel",
        serverLabel: "Server",
        items: [],
        servers: [
          {
            key: "s",
            name: "Ariel",
            items: [],
            characters: [
              {
                id: 1,
                name: "Tarion",
                className: null,
                classColor: null,
                level: null,
                isMain: true,
                items: characterItems,
              },
            ],
          },
        ],
      },
    ],
  };
}

describe("summarizeDashboard", () => {
  it("counts tasks but not resources", () => {
    // Arrange
    const dashboard = dashboardWith([
      item({ title: "Dungeons" }),
      item({ title: "Quests", status: "done" }),
      item({
        title: "Energie",
        kind: "regen",
        status: "info",
        resource: { value: 20, cap: 200, fullAt: null },
      }),
    ]);

    // Act
    const summary = summarizeDashboard(dashboard);

    // Assert
    expect(summary).toMatchObject({ total: 3, done: 2, full: [] });
  });

  it("lists full resources with their owner", () => {
    // Arrange
    const dashboard = dashboardWith([
      item({
        title: "Albtraum",
        kind: "stacking",
        status: "open",
        resource: { value: 14, cap: 14, fullAt: null },
      }),
    ]);

    // Act
    const { full } = summarizeDashboard(dashboard);

    // Assert
    expect(full).toEqual([
      expect.objectContaining({
        title: "Albtraum",
        owner: "Tarion",
        value: 14,
        cap: 14,
      }),
    ]);
  });

  it("finds the soonest reset among open tasks", () => {
    // Arrange
    const dashboard = dashboardWith([
      item({ nextReset: "2026-11-02T04:00:00.000Z" }),
      item({ nextReset: "2026-10-29T04:00:00.000Z" }),
      item({ nextReset: "2026-10-28T20:00:00.000Z", status: "done" }),
    ]);

    // Act & Assert
    expect(summarizeDashboard(dashboard).nextReset).toBe(
      "2026-10-29T04:00:00.000Z",
    );
  });
});
