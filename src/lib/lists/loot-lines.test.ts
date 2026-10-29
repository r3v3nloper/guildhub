import { describe, expect, it } from "vitest";
import { formatLootLines, parseLootLines } from "./loot-lines";

describe("parseLootLines", () => {
  it("reads name, note and a link anywhere in the line", () => {
    // Act
    const result = parseLootLines(
      [
        "Arkanitschnitter – BiS Krieger – https://www.wowhead.com/item=12345",
        "",
        "Robe der Erzmagier",
        "https://example.org/helm Helm der Wut - für Tanks",
      ].join("\n"),
    );

    // Assert
    expect(result).toEqual({
      ok: true,
      loot: [
        {
          name: "Arkanitschnitter",
          notes: "BiS Krieger",
          link: "https://www.wowhead.com/item=12345",
        },
        { name: "Robe der Erzmagier", notes: null, link: null },
        {
          name: "Helm der Wut",
          notes: "für Tanks",
          link: "https://example.org/helm",
        },
      ],
    });
  });

  it("round-trips through the text form", () => {
    // Arrange
    const text =
      "Arkanitschnitter – BiS Krieger – https://example.org/1\nRobe der Erzmagier";
    const parsed = parseLootLines(text);

    // Act
    const formatted = parsed.ok ? formatLootLines(parsed.loot) : "";

    // Assert
    expect(formatted).toBe(text);
  });

  it("rejects a line that is only a link or only a note", () => {
    // Act & Assert
    expect(parseLootLines("https://example.org/x").ok).toBe(false);
    expect(parseLootLines("– nur eine Notiz").ok).toBe(false);
  });
});
