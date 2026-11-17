import { describe, expect, it } from "vitest";
import { adler32 } from "./adler32";
import { decodeAddonString, encodeAddonString } from "./addon-string";

const expected = { gameId: "wow-forever", kind: "export" } as const;

describe("adler32", () => {
  it("matches the reference value", () => {
    // Act
    const checksum = adler32("Wikipedia");

    // Assert
    expect(checksum).toBe("11e60398");
  });

  it("works on the UTF-8 bytes, as Lua sees them", () => {
    // Act
    const checksum = adler32("ä");

    // Assert: the two bytes C3 A4, not the single code point E4
    expect(checksum).toBe("022c0168");
  });
});

describe("addon strings", () => {
  it("decodes what it encoded, also when the game wrapped the line", () => {
    // Arrange
    const text = encodeAddonString({
      gameId: "wow-forever",
      kind: "export",
      payload: "C,Die Aldor,Thrall",
    });
    const wrapped = `  ${text.slice(0, 20)}\r\n${text.slice(20)}\n`;

    // Act
    const result = decodeAddonString(wrapped, expected);

    // Assert
    expect(result).toEqual({
      ok: true,
      value: {
        gameId: "wow-forever",
        kind: "export",
        payload: "C,Die Aldor,Thrall",
      },
    });
  });

  it("rejects a string cut short while copying", () => {
    // Arrange
    const text = encodeAddonString({ ...expected, payload: "C,Realm,Thrall" });

    // Act
    const result = decodeAddonString(text.slice(0, -3), expected);

    // Assert
    expect(result).toEqual({
      ok: false,
      error: expect.stringMatching(/unvollständig/),
    });
  });

  it.each([
    ["no addon text", "Hallo", /kein Text aus dem GuildHub-Addon/],
    [
      "an unknown version",
      encodeAddonString({ ...expected, payload: "" }).replace("GH1", "GH9"),
      /Addon aktualisieren/,
    ],
    [
      "another game",
      encodeAddonString({ gameId: "aion2", kind: "export", payload: "" }),
      /anderen Spiel/,
    ],
    [
      "the guild snapshot",
      encodeAddonString({ ...expected, kind: "guild", payload: "" }),
      /gehört ins Addon/,
    ],
  ])("rejects %s", (_, text, message) => {
    // Act
    const result = decodeAddonString(text, expected);

    // Assert
    expect(result).toEqual({
      ok: false,
      error: expect.stringMatching(message),
    });
  });
});
