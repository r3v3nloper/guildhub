import { describe, expect, it } from "vitest";
import { escapeField, formatGuildSnapshot } from "./guild-snapshot";

describe("escapeField", () => {
  it("percent-encodes separators, line breaks and the percent sign", () => {
    // Act
    const escaped = escapeField("2x Elixier; schnell: 100%,\nbitte");

    // Assert
    expect(escaped).toBe("2x Elixier%3B schnell%3A 100%25%2C%0Abitte");
  });
});

describe("formatGuildSnapshot", () => {
  it("lists members with characters and professions, then the requests", () => {
    // Act
    const payload = formatGuildSnapshot({
      createdAt: new Date("2026-11-17T12:00:00Z"),
      self: 2,
      members: [
        {
          characters: [
            {
              realm: "Die Aldor",
              name: "Thrall",
              professions: [{ ref: "171", skill: 150, spellIds: [2330, 2335] }],
            },
          ],
        },
        { characters: [] },
      ],
      requests: [
        {
          id: 17,
          status: "accepted",
          requester: 2,
          crafter: 1,
          professionRef: "171",
          spellId: 2330,
          quantity: 5,
          item: "Schwacher Heiltrank",
          notes: null,
        },
      ],
    });

    // Assert
    expect(payload.split(";")).toEqual([
      "T,1794916800",
      "S,2",
      "M",
      "C,Die Aldor,Thrall",
      "K,171,150,2330,2335",
      "M",
      "R,17,accepted,2,1,171,2330,5,Schwacher Heiltrank,",
    ]);
  });
});
