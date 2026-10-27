import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { getDb } from "@/lib/db/client";
import { accounts, sessions, users, verificationTokens } from "@/lib/db/schema";
import { serverEnv } from "@/lib/env";
import { isDiscordIdAllowed } from "./allowlist";
import { withoutOAuthTokens } from "./token-free-adapter";

export const { handlers, auth, signIn, signOut } = NextAuth(() => ({
  adapter: withoutOAuthTokens(
    DrizzleAdapter(getDb(), {
      usersTable: users,
      accountsTable: accounts,
      sessionsTable: sessions,
      verificationTokensTable: verificationTokens,
    }),
  ),
  providers: [Discord],
  session: { strategy: "database" },
  pages: {
    error: "/kein-zugang",
  },
  callbacks: {
    signIn({ account }) {
      if (account?.provider !== "discord") {
        return false;
      }
      return isDiscordIdAllowed(account.providerAccountId, serverEnv());
    },
  },
}));
