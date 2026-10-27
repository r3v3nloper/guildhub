import { describe, expect, it } from "vitest";
import { parseDiscordIdList, parseServerEnv } from "./env";

const ownerId = "123456789012345678";
const memberId = "234567890123456789";

describe("parseDiscordIdList", () => {
  it("returns an empty list for missing or blank input", () => {
    expect(parseDiscordIdList(undefined)).toEqual([]);
    expect(parseDiscordIdList(" , ,")).toEqual([]);
  });

  it("trims entries and removes duplicates", () => {
    const result = parseDiscordIdList(` ${ownerId}, ${memberId} ,${ownerId}`);

    expect(result).toEqual([ownerId, memberId]);
  });

  it("rejects entries that are not Discord IDs", () => {
    expect(() => parseDiscordIdList(`${ownerId},someone`)).toThrow(/someone/);
  });
});

describe("parseServerEnv", () => {
  it("applies defaults when optional values are missing", () => {
    const env = parseServerEnv({});

    expect(env).toEqual({
      databasePath: "./data/guildhub.db",
      ownerDiscordId: undefined,
      allowedDiscordIds: [],
      guildName: undefined,
      defaultTimezone: "Europe/Berlin",
    });
  });

  it("treats an empty OWNER_DISCORD_ID as unset, as in a fresh .env.example copy", () => {
    const env = parseServerEnv({ OWNER_DISCORD_ID: "", GUILD_NAME: "" });

    expect(env.ownerDiscordId).toBeUndefined();
    expect(env.guildName).toBeUndefined();
  });

  it("rejects an invalid OWNER_DISCORD_ID", () => {
    expect(() => parseServerEnv({ OWNER_DISCORD_ID: "owner" })).toThrow();
  });
});
