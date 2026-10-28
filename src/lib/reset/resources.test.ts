import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import {
  projectRegen,
  projectStacking,
  regenFullAt,
  type RegenSettings,
} from "./resources";
import type { ResetRule } from "./types";

const BERLIN = "Europe/Berlin";
const at = (iso: string) => DateTime.fromISO(iso, { zone: BERLIN });

const twoHourly: RegenSettings = {
  cap: 1000,
  regenAmount: 15,
  regenIntervalMinutes: 120,
  regenAlignment: "fixed",
};

describe("projectRegen with fixed ticks", () => {
  it.each([
    ["a normal day", "2026-10-26T23:00", "2026-10-27T05:00"],
    ["the repeated autumn hour", "2026-10-24T23:00", "2026-10-25T05:00"],
    ["the spring gap", "2026-03-28T23:00", "2026-03-29T05:00"],
  ])("counts three ticks across %s", (_label, valueAt, now) => {
    // Act
    const value = projectRegen(
      twoHourly,
      BERLIN,
      { value: 0, valueAt: at(valueAt) },
      at(now),
    );

    // Assert: 00:00, 02:00 (once / moved to 03:00), 04:00
    expect(value).toBe(45);
  });

  it("skips a tick at valueAt and counts a tick at now", () => {
    // Act
    const value = projectRegen(
      twoHourly,
      BERLIN,
      { value: 0, valueAt: at("2026-10-27T00:00") },
      at("2026-10-27T02:00"),
    );

    // Assert
    expect(value).toBe(15);
  });

  it("aligns ticks to local midnight", () => {
    // Arrange
    const threeHourly = { ...twoHourly, regenIntervalMinutes: 180 };

    // Act
    const value = projectRegen(
      threeHourly,
      BERLIN,
      { value: 0, valueAt: at("2026-10-27T01:00") },
      at("2026-10-27T06:00"),
    );

    // Assert: 03:00 and 06:00
    expect(value).toBe(30);
  });

  it("stops at the cap", () => {
    // Act
    const value = projectRegen(
      twoHourly,
      BERLIN,
      { value: 990, valueAt: at("2026-10-01T00:00") },
      at("2026-10-27T00:00"),
    );

    // Assert
    expect(value).toBe(1000);
  });

  it("never returns a negative value", () => {
    // Act
    const value = projectRegen(
      twoHourly,
      BERLIN,
      { value: -5, valueAt: at("2026-10-27T00:30") },
      at("2026-10-27T01:00"),
    );

    // Assert
    expect(value).toBe(0);
  });
});

describe("projectRegen with relative ticks", () => {
  const relative: RegenSettings = {
    ...twoHourly,
    regenIntervalMinutes: 180,
    regenAlignment: "relative",
  };

  it("counts ticks from valueAt", () => {
    // Arrange
    const snapshot = { value: 0, valueAt: at("2026-10-27T10:00") };

    // Act & Assert
    expect(
      projectRegen(relative, BERLIN, snapshot, at("2026-10-27T15:59")),
    ).toBe(15);
    expect(
      projectRegen(relative, BERLIN, snapshot, at("2026-10-27T16:00")),
    ).toBe(30);
  });
});

describe("regenFullAt", () => {
  it("returns the tick that fills the resource", () => {
    // Act
    const fullAt = regenFullAt(
      twoHourly,
      BERLIN,
      { value: 970, valueAt: at("2026-10-27T01:00") },
      at("2026-10-27T01:00"),
    );

    // Assert: 970 → 985 at 02:00 → 1000 at 04:00
    expect(+fullAt!).toBe(+at("2026-10-27T04:00"));
  });

  it("returns nothing for a full resource", () => {
    // Act
    const fullAt = regenFullAt(
      twoHourly,
      BERLIN,
      { value: 1000, valueAt: at("2026-10-27T01:00") },
      at("2026-10-27T03:00"),
    );

    // Assert
    expect(fullAt).toBeUndefined();
  });
});

describe("projectStacking", () => {
  const daily: ResetRule = {
    type: "daily",
    time: "05:00",
    timezone: null,
    weekday: null,
    day_of_month: null,
    n_days: null,
    anchor: null,
  };
  const nightmare = { cap: 14, perPeriodGain: 2 };

  it("adds one gain per skipped period", () => {
    // Act
    const value = projectStacking(
      nightmare,
      daily,
      BERLIN,
      { value: 0, valueAt: at("2026-10-20T12:00") },
      at("2026-10-23T12:00"),
    );

    // Assert: resets on the 21st, 22nd and 23rd
    expect(value).toBe(6);
  });

  it("stops at the cap", () => {
    // Act
    const value = projectStacking(
      nightmare,
      daily,
      BERLIN,
      { value: 10, valueAt: at("2026-10-01T12:00") },
      at("2026-10-27T12:00"),
    );

    // Assert
    expect(value).toBe(14);
  });
});
