import { describe, expect, it } from "vitest";
import { splitTextLinks } from "./text-links";

describe("splitTextLinks", () => {
  it("keeps text without links as one part", () => {
    // Act
    const parts = splitTextLinks("Kein Link\nzweite Zeile");

    // Assert
    expect(parts).toEqual([{ kind: "text", text: "Kein Link\nzweite Zeile" }]);
  });

  it("finds links between text and leaves sentence punctuation outside", () => {
    // Act
    const parts = splitTextLinks(
      "Regeln: https://example.org/regeln. Discord (https://discord.gg/abc)",
    );

    // Assert
    expect(parts).toEqual([
      { kind: "text", text: "Regeln: " },
      { kind: "link", url: "https://example.org/regeln" },
      { kind: "text", text: ". Discord (" },
      { kind: "link", url: "https://discord.gg/abc" },
      { kind: "text", text: ")" },
    ]);
  });

  it("does not turn other schemes into links", () => {
    // Act
    const parts = splitTextLinks("javascript:alert(1) ftp://example.org");

    // Assert
    expect(parts).toEqual([
      { kind: "text", text: "javascript:alert(1) ftp://example.org" },
    ]);
  });

  it("returns nothing for empty text", () => {
    // Act & Assert
    expect(splitTextLinks("")).toEqual([]);
  });
});
