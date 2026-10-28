import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import type { AppDatabase } from "@/lib/db/client";
import {
  gameCatalogEntries,
  resourceStates,
  taskDefinitions,
  taskProgress,
} from "@/lib/db/schema";
import { createDiscordUser, createTestDb } from "@/lib/db/test-db";
import { ensureGuild } from "@/lib/guild/guild";
import type { LoadedPack } from "./loader";
import { syncPack } from "./sync";
import { validatePack } from "./validate";

const dailyRule = { id: "daily", type: "daily", time: "05:00" };
const weekly = {
  id: "weekly",
  kind: "recurring",
  title: "Wochenquest",
  scope: "character",
  reset_rule_id: "daily",
};

function packFile(
  tasks: unknown[],
  overrides: Record<string, unknown> = {},
): LoadedPack {
  const raw = {
    id: "game",
    name: "Spiel",
    version: "1.0.0",
    capabilities: { resets: true },
    regions: [{ id: "eu", timezone: "Europe/Berlin" }],
    reset_rules: [dailyRule],
    tasks,
    ...overrides,
  };
  return {
    folderName: "game",
    file: "packs/game/pack.json",
    content: JSON.stringify(raw),
    ...validatePack(raw, "game"),
  };
}

function task(db: AppDatabase, key: string) {
  return db
    .select()
    .from(taskDefinitions)
    .where(eq(taskDefinitions.key, key))
    .get()!;
}

describe("syncTasks", () => {
  let db: AppDatabase;
  let userId: string;

  beforeEach(() => {
    db = createTestDb();
    ensureGuild(db, {
      guildName: "Testgilde",
      defaultTimezone: "Europe/Berlin",
    });
    userId = createDiscordUser(db, "123456789012345678");
  });

  function addProgress(
    taskId: number,
    values: Partial<typeof taskProgress.$inferInsert>,
  ) {
    db.insert(taskProgress)
      .values({
        taskId,
        scopeKey: "c:1",
        periodKey: "daily:2026-10-27",
        updatedAt: new Date(),
        updatedBy: userId,
        ...values,
      })
      .run();
  }

  it("creates pack tasks pointing at their reset rule", () => {
    // Act
    const result = syncPack(db, packFile([weekly]));

    // Assert
    const rule = db
      .select()
      .from(gameCatalogEntries)
      .where(eq(gameCatalogEntries.kind, "reset_rule"))
      .get()!;
    expect(result.status).toBe("success");
    expect(task(db, "weekly")).toMatchObject({
      source: "pack",
      gameId: "game",
      kind: "recurring",
      resetRuleEntryId: rule.id,
      active: true,
    });
  });

  it("deactivates a vanished task and keeps its progress", () => {
    // Arrange
    syncPack(db, packFile([weekly]));
    addProgress(task(db, "weekly").id, { completedAt: new Date() });

    // Act
    const result = syncPack(db, packFile([], { version: "1.1.0" }));

    // Assert
    expect(result.summary?.removed).toBe(1);
    expect(task(db, "weekly").active).toBe(false);
    expect(db.select().from(taskProgress).all()).toHaveLength(1);
  });

  it("skips the pack when a task changes its kind", () => {
    // Arrange
    syncPack(db, packFile([weekly]));

    // Act
    const result = syncPack(
      db,
      packFile([{ ...weekly, kind: "counter", cap: 3 }], { version: "1.1.0" }),
    );

    // Assert
    expect(result.status).toBe("error");
    expect(result.error).toContain("'weekly'");
    expect(task(db, "weekly").kind).toBe("recurring");
  });

  it("moves progress to the replacing task and merges collisions", () => {
    // Arrange
    const lockoutPack = (tasks: unknown[], version: string) =>
      packFile(tasks, {
        version,
        capabilities: { resets: true, lockouts: true },
        bosses: [
          { id: "a", name: "A" },
          { id: "b", name: "B" },
        ],
      });
    const raid = {
      id: "raid",
      kind: "lockout",
      title: "Raid",
      scope: "character",
      reset_rule_id: "daily",
      bosses: ["a", "b"],
    };
    syncPack(db, lockoutPack([raid, { ...raid, id: "raid-new" }], "1.0.0"));
    const oldId = task(db, "raid").id;
    const newId = task(db, "raid-new").id;
    addProgress(oldId, {
      value: 2,
      data: { killed: ["a"] },
      completedAt: new Date("2026-10-27T10:00:00Z"),
    });
    addProgress(newId, {
      value: 1,
      data: { killed: ["b"] },
      completedAt: new Date("2026-10-27T12:00:00Z"),
    });
    addProgress(oldId, { scopeKey: "c:2" });

    // Act
    const result = syncPack(
      db,
      lockoutPack([{ ...raid, id: "raid-new", replaces: ["raid"] }], "1.1.0"),
    );

    // Assert
    expect(result.summary?.migrations).toEqual([
      {
        kind: "task",
        from: "raid",
        to: "raid-new",
        rows_rewritten: 1,
        rows_merged: 1,
      },
    ]);
    const rows = db
      .select()
      .from(taskProgress)
      .where(eq(taskProgress.taskId, newId))
      .all();
    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.scopeKey === "c:1")).toMatchObject({
      value: 2,
      data: { killed: ["b", "a"] },
      completedAt: new Date("2026-10-27T10:00:00Z"),
    });
    expect(task(db, "raid").active).toBe(false);
  });

  it("keeps the newer resource snapshot when merging", () => {
    // Arrange
    const energy = {
      id: "energy",
      kind: "regen",
      title: "Energie",
      scope: "character",
      cap: 100,
      regen_amount: 10,
      regen_interval_minutes: 60,
    };
    syncPack(db, packFile([energy, { ...energy, id: "energy-new" }]));
    const snapshot = (taskId: number, value: number, valueAt: string) =>
      db
        .insert(resourceStates)
        .values({ taskId, scopeKey: "c:1", value, valueAt: new Date(valueAt) })
        .run();
    snapshot(task(db, "energy").id, 70, "2026-10-27T12:00:00Z");
    snapshot(task(db, "energy-new").id, 20, "2026-10-27T08:00:00Z");

    // Act
    syncPack(
      db,
      packFile([{ ...energy, id: "energy-new", replaces: ["energy"] }], {
        version: "1.1.0",
      }),
    );

    // Assert
    expect(db.select().from(resourceStates).all()).toEqual([
      expect.objectContaining({
        taskId: task(db, "energy-new").id,
        value: 70,
      }),
    ]);
  });
});
