import type { Adapter, AdapterAccount } from "next-auth/adapters";
import { describe, expect, it, vi } from "vitest";
import { withoutOAuthTokens } from "./token-free-adapter";

const discordAccount: AdapterAccount = {
  userId: "user-1",
  type: "oauth",
  provider: "discord",
  providerAccountId: "123456789012345678",
  access_token: "access",
  refresh_token: "refresh",
  id_token: "id",
  token_type: "bearer",
  scope: "identify",
  expires_at: 1,
};

describe("withoutOAuthTokens", () => {
  it("links the account without access, refresh and id tokens", async () => {
    const linkAccount = vi.fn();
    const adapter = withoutOAuthTokens({ linkAccount } as Adapter);

    await adapter.linkAccount!(discordAccount);

    const stored = linkAccount.mock.calls[0][0] as AdapterAccount;
    expect(stored).not.toHaveProperty("access_token");
    expect(stored).not.toHaveProperty("refresh_token");
    expect(stored).not.toHaveProperty("id_token");
    expect(stored).toMatchObject({
      provider: "discord",
      providerAccountId: "123456789012345678",
      scope: "identify",
    });
  });

  it("keeps all other adapter methods", () => {
    const getUser = vi.fn();
    const adapter = withoutOAuthTokens({ getUser, linkAccount: vi.fn() });

    expect(adapter.getUser).toBe(getUser);
  });
});
