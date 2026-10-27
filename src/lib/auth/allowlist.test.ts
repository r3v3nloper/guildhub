import { describe, expect, it } from "vitest";
import { isDiscordIdAllowed } from "./allowlist";

const ownerId = "123456789012345678";
const memberId = "234567890123456789";
const strangerId = "345678901234567890";

describe("isDiscordIdAllowed", () => {
  const env = { ownerDiscordId: ownerId, allowedDiscordIds: [memberId] };

  it("allows the owner even if not listed in ALLOWED_DISCORD_IDS", () => {
    expect(isDiscordIdAllowed(ownerId, env)).toBe(true);
  });

  it("allows listed members", () => {
    expect(isDiscordIdAllowed(memberId, env)).toBe(true);
  });

  it("denies everyone else", () => {
    expect(isDiscordIdAllowed(strangerId, env)).toBe(false);
  });

  it("denies everyone when nothing is configured", () => {
    const emptyEnv = { ownerDiscordId: undefined, allowedDiscordIds: [] };

    expect(isDiscordIdAllowed(strangerId, emptyEnv)).toBe(false);
  });
});
