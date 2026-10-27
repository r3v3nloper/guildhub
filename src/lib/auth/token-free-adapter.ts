import type { Adapter, AdapterAccount } from "next-auth/adapters";

const oauthTokenFields = [
  "access_token",
  "refresh_token",
  "id_token",
] as const satisfies (keyof AdapterAccount)[];

export function stripOAuthTokens(account: AdapterAccount): AdapterAccount {
  const stripped = { ...account };
  for (const field of oauthTokenFields) {
    delete stripped[field];
  }
  return stripped;
}

/**
 * Only the Discord identity is needed, so OAuth tokens are never persisted (SPEC 11.4).
 * This keeps them out of the DB and therefore out of every backup.
 */
export function withoutOAuthTokens(adapter: Adapter): Adapter {
  return {
    ...adapter,
    linkAccount: (account) => adapter.linkAccount!(stripOAuthTokens(account)),
  };
}
