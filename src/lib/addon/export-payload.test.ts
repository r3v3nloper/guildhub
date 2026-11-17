import { describe, expect, it } from "vitest";
import { parseCharacterExport } from "./export-payload";

describe("parseCharacterExport", () => {
  it("reads characters with their professions and the request actions", () => {
    // Arrange
    const payload = [
      "C,Die Aldor,Thrall,Horde,Orc,SHAMAN,42,3",
      "P,171,150,2330,3170",
      "P,182,120",
      "C,Die Aldor,Grom,Horde,Orc,WARRIOR,,",
      "A,17,accept,1794916800",
    ].join(";");

    // Act
    const result = parseCharacterExport(payload);

    // Assert
    expect(result).toEqual({
      ok: true,
      value: {
        characters: [
          {
            realm: "Die Aldor",
            name: "Thrall",
            factionRef: "Horde",
            raceRef: "Orc",
            classRef: "SHAMAN",
            level: 42,
            deaths: 3,
            professions: [
              { ref: "171", skill: 150, spellIds: [2330, 3170] },
              { ref: "182", skill: 120, spellIds: [] },
            ],
          },
          {
            realm: "Die Aldor",
            name: "Grom",
            factionRef: "Horde",
            raceRef: "Orc",
            classRef: "WARRIOR",
            level: null,
            deaths: null,
            professions: [],
          },
        ],
        requestActions: [
          {
            requestId: 17,
            action: "accept",
            at: new Date("2026-11-17T12:00:00Z"),
          },
        ],
      },
    });
  });

  it("skips record types a newer addon may add", () => {
    // Act
    const result = parseCharacterExport("X,whatever;C,Realm,Thrall,,,,,");

    // Assert
    expect(result.ok && result.value.characters).toHaveLength(1);
  });

  it.each([
    ["a profession before any character", "P,171,1", /Beruf ohne Charakter/],
    ["a character without name", "C,Realm,,,,,,", /Charaktername/],
    ["a negative level", "C,Realm,Thrall,,,,-1,", /ungültige Zahl/],
    ["a recipe that is no number", "C,R,Thrall;P,171,1,abc", /ungültige Zahl/],
    ["an unknown action", "A,1,steal,1", /unbekannte Antrags-Aktion/],
  ])("rejects %s and names the record", (_, payload, message) => {
    // Act
    const result = parseCharacterExport(payload);

    // Assert
    expect(result).toEqual({
      ok: false,
      error: expect.stringMatching(message),
    });
  });
});
