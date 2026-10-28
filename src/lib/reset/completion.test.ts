import { describe, expect, it } from "vitest";
import {
  isCompleted,
  type CompletionTask,
  type ProgressEntry,
} from "./completion";

const KEY = "daily:2026-10-27";

function progress(overrides: Partial<ProgressEntry>): ProgressEntry {
  return {
    periodKey: KEY,
    value: 0,
    data: null,
    completedAt: null,
    ...overrides,
  };
}

const recurring: CompletionTask = {
  kind: "recurring",
  cap: null,
  bosses: null,
};

describe("isCompleted", () => {
  it("counts a checked recurring task in the current period", () => {
    // Act
    const done = isCompleted(
      recurring,
      progress({ completedAt: new Date() }),
      KEY,
    );

    // Assert
    expect(done).toBe(true);
  });

  it("reopens a task once the period has moved on", () => {
    // Act
    const done = isCompleted(
      recurring,
      progress({ completedAt: new Date() }),
      "daily:2026-10-28",
    );

    // Assert
    expect(done).toBe(false);
  });

  it("completes a counter at its cap", () => {
    // Arrange
    const counter: CompletionTask = { kind: "counter", cap: 5, bosses: null };

    // Act & Assert
    expect(isCompleted(counter, progress({ value: 4 }), KEY)).toBe(false);
    expect(isCompleted(counter, progress({ value: 5 }), KEY)).toBe(true);
  });

  it("completes a lockout when all bosses are down", () => {
    // Arrange
    const lockout: CompletionTask = {
      kind: "lockout",
      cap: null,
      bosses: ["a", "b"],
    };

    // Act & Assert
    expect(
      isCompleted(lockout, progress({ data: { killed: ["a"] } }), KEY),
    ).toBe(false);
    expect(
      isCompleted(lockout, progress({ data: { killed: ["a", "b"] } }), KEY),
    ).toBe(true);
  });

  it("completes a lockout without bosses like a recurring task", () => {
    // Arrange
    const lockout: CompletionTask = { kind: "lockout", cap: null, bosses: [] };

    // Act & Assert
    expect(isCompleted(lockout, progress({}), KEY)).toBe(false);
    expect(
      isCompleted(lockout, progress({ completedAt: new Date() }), KEY),
    ).toBe(true);
  });

  it("never completes a resource", () => {
    // Arrange
    const regen: CompletionTask = { kind: "regen", cap: 100, bosses: null };

    // Act
    const done = isCompleted(regen, progress({ value: 100 }), KEY);

    // Assert
    expect(done).toBe(false);
  });
});
