import { describe, expect, it } from "vitest";
import { daysSince, formatAge } from "./format";

const now = new Date("2026-10-29T12:00:00Z");
const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000);

describe("formatAge", () => {
  it("says how long ago, coarser the older it is", () => {
    // Act & Assert
    expect(formatAge(ago(0), now)).toBe("gerade eben");
    expect(formatAge(ago(5), now)).toBe("vor 5 Min.");
    expect(formatAge(ago(3 * 60 + 20), now)).toBe("vor 3 Std.");
    expect(formatAge(ago(30 * 60), now)).toBe("gestern");
    expect(formatAge(ago(4 * 24 * 60), now)).toBe("vor 4 Tagen");
  });

  it("counts whole days", () => {
    // Act & Assert
    expect(daysSince(ago(47 * 60), now)).toBe(1);
    expect(daysSince(ago(-10), now)).toBe(0);
  });
});
