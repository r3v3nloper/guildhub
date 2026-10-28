import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import {
  countPeriodStarts,
  effectiveTimezone,
  getNextReset,
  getPeriod,
  getPeriodKey,
  getPeriodStart,
  InvalidResetRuleError,
} from "./periods";
import type { ResetRule } from "./types";

const BERLIN = "Europe/Berlin";
const at = (iso: string, zone = BERLIN) => DateTime.fromISO(iso, { zone });
const utc = (iso: string) => DateTime.fromISO(iso, { zone: "utc" });

function rule(overrides: Partial<ResetRule>): ResetRule {
  return {
    type: "daily",
    time: "05:00",
    timezone: null,
    weekday: null,
    day_of_month: null,
    n_days: null,
    anchor: null,
    ...overrides,
  };
}

const daily = rule({});
const weeklyWednesday = rule({ type: "weekly", weekday: 3 });

describe("daily reset boundaries", () => {
  it("starts the new period exactly at the reset time", () => {
    // Arrange
    const now = at("2026-10-27T05:00:00");

    // Act
    const period = getPeriod(daily, BERLIN, now);

    // Assert
    expect(period.key).toBe("daily:2026-10-27");
    expect(+period.start).toBe(+now);
    expect(+period.next).toBe(+at("2026-10-28T05:00:00"));
  });

  it("keeps one second before the reset in the previous period", () => {
    // Act
    const key = getPeriodKey(daily, BERLIN, at("2026-10-27T04:59:59"));

    // Assert
    expect(key).toBe("daily:2026-10-26");
  });
});

describe("daylight saving time", () => {
  it("resets at 05:00 local time across the switch to winter time", () => {
    // Act
    const period = getPeriod(daily, BERLIN, at("2026-10-25T04:59:00"));

    // Assert: the day is 25 hours long, the reset still happens at 05:00 CET.
    expect(period.key).toBe("daily:2026-10-24");
    expect(+period.start).toBe(+utc("2026-10-24T03:00:00"));
    expect(+period.next).toBe(+utc("2026-10-25T04:00:00"));
  });

  it("resets at 05:00 local time across the switch to summer time", () => {
    // Act
    const period = getPeriod(daily, BERLIN, at("2026-03-29T12:00:00"));

    // Assert
    expect(period.key).toBe("daily:2026-03-29");
    expect(+period.start).toBe(+utc("2026-03-29T03:00:00"));
    expect(+getPeriodStart(daily, BERLIN, at("2026-03-29T04:00:00"))).toBe(
      +utc("2026-03-28T04:00:00"),
    );
  });

  it("moves a reset inside the spring gap to the end of the gap", () => {
    // Arrange
    const gapRule = rule({ time: "02:30" });

    // Act
    const period = getPeriod(gapRule, BERLIN, at("2026-03-29T03:10:00"));

    // Assert: 02:30 does not exist that night, the reset happens at 03:00 CEST.
    expect(period.key).toBe("daily:2026-03-29");
    expect(+period.start).toBe(+utc("2026-03-29T01:00:00"));
    expect(getPeriodKey(gapRule, BERLIN, utc("2026-03-29T00:59:00"))).toBe(
      "daily:2026-03-28",
    );
  });

  it("uses the first occurrence of a reset in the repeated autumn hour", () => {
    // Arrange
    const repeatedRule = rule({ time: "02:30" });

    // Act
    const firstPass = getPeriod(
      repeatedRule,
      BERLIN,
      utc("2026-10-25T00:45:00"),
    );
    const secondPass = getPeriod(
      repeatedRule,
      BERLIN,
      utc("2026-10-25T01:45:00"),
    );

    // Assert: 02:30 CEST is 00:30 UTC; the second 02:30 (CET) starts no new period.
    expect(+firstPass.start).toBe(+utc("2026-10-25T00:30:00"));
    expect(secondPass.key).toBe("daily:2026-10-25");
    expect(+secondPass.start).toBe(+firstPass.start);
  });
});

describe("weekly reset on Wednesday", () => {
  it.each([
    ["Monday", "2026-10-26T12:00:00", "weekly:2026-10-21"],
    ["Tuesday", "2026-10-27T23:59:00", "weekly:2026-10-21"],
    ["Wednesday before the reset", "2026-10-28T04:59:59", "weekly:2026-10-21"],
    ["Wednesday at the reset", "2026-10-28T05:00:00", "weekly:2026-10-28"],
  ])("assigns %s to the right week", (_label, now, expected) => {
    // Act
    const key = getPeriodKey(weeklyWednesday, BERLIN, at(now));

    // Assert
    expect(key).toBe(expected);
  });

  it("keys the turn of the year by the Wednesday before it", () => {
    // Act
    const key = getPeriodKey(
      weeklyWednesday,
      BERLIN,
      at("2027-01-01T12:00:00"),
    );

    // Assert
    expect(key).toBe("weekly:2026-12-30");
  });
});

describe("every_n_days", () => {
  const everyThreeDays = rule({
    type: "every_n_days",
    n_days: 3,
    anchor: "2026-10-01",
  });

  it("counts periods from an anchor in the past", () => {
    // Act
    const period = getPeriod(everyThreeDays, BERLIN, at("2026-10-27T12:00:00"));

    // Assert
    expect(period.key).toBe("every_n_days:2026-10-25");
    expect(+period.next).toBe(+at("2026-10-28T05:00:00"));
    expect(
      getPeriodKey(everyThreeDays, BERLIN, at("2026-10-25T04:00:00")),
    ).toBe("every_n_days:2026-10-22");
  });

  it("rejects an anchor in the future", () => {
    // Arrange
    const futureAnchor = rule({
      type: "every_n_days",
      n_days: 3,
      anchor: "2026-11-01",
    });

    // Act & Assert
    expect(() =>
      getPeriodKey(futureAnchor, BERLIN, at("2026-10-27T12:00:00")),
    ).toThrow(InvalidResetRuleError);
  });

  it("counts no periods before the anchor", () => {
    // Act
    const count = countPeriodStarts(
      everyThreeDays,
      BERLIN,
      at("2026-09-01T00:00:00"),
      at("2026-10-05T12:00:00"),
    );

    // Assert: 01.10. and 04.10.
    expect(count).toBe(2);
  });
});

describe("monthly", () => {
  it("resets on the first of the month", () => {
    // Arrange
    const firstOfMonth = rule({ type: "monthly", day_of_month: 1 });

    // Act & Assert
    expect(getPeriodKey(firstOfMonth, BERLIN, at("2026-10-01T05:00:00"))).toBe(
      "monthly:2026-10-01",
    );
    expect(getPeriodKey(firstOfMonth, BERLIN, at("2026-10-01T04:59:00"))).toBe(
      "monthly:2026-09-01",
    );
    expect(getPeriodKey(firstOfMonth, BERLIN, at("2027-01-01T04:00:00"))).toBe(
      "monthly:2026-12-01",
    );
  });

  it("resets on the 28th of the month", () => {
    // Arrange
    const twentyEighth = rule({ type: "monthly", day_of_month: 28 });

    // Act
    const period = getPeriod(twentyEighth, BERLIN, at("2026-10-27T12:00:00"));

    // Assert
    expect(period.key).toBe("monthly:2026-09-28");
    expect(+period.next).toBe(+at("2026-10-28T05:00:00"));
    expect(+getNextReset(twentyEighth, BERLIN, at("2026-12-28T06:00:00"))).toBe(
      +at("2027-01-28T05:00:00"),
    );
  });
});

describe("time zones", () => {
  it("prefers the rule's own zone over the region's", () => {
    // Arrange
    const utcMidnight = rule({ time: "00:00", timezone: "UTC" });
    const regionMidnight = rule({ time: "00:00" });
    const now = at("2026-10-27T00:30:00");

    // Act
    const utcKey = getPeriodKey(
      utcMidnight,
      effectiveTimezone(utcMidnight, BERLIN),
      now,
    );
    const regionKey = getPeriodKey(
      regionMidnight,
      effectiveTimezone(regionMidnight, BERLIN),
      now,
    );

    // Assert: 00:30 in Berlin is still the 26th in UTC.
    expect(utcKey).toBe("daily:2026-10-26");
    expect(regionKey).toBe("daily:2026-10-27");
  });

  it("computes in the rule's zone and leaves display to the user's zone", () => {
    // Arrange: 00:30 in New York is 05:30 in Berlin.
    const now = at("2026-10-27T00:30:00", "America/New_York");

    // Act
    const period = getPeriod(daily, BERLIN, now);

    // Assert
    expect(period.key).toBe("daily:2026-10-27");
    expect(period.next.setZone("America/New_York").toISO()).toBe(
      "2026-10-28T00:00:00.000-04:00",
    );
  });
});
