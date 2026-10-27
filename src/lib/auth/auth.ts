import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { getDb } from "@/lib/db/client";
import { accounts, sessions, users, verificationTokens } from "@/lib/db/schema";
import { serverEnv } from "@/lib/env";
import { getGuild } from "@/lib/guild/guild";
import { isDiscordIdAllowed } from "./allowlist";
import { ensureMembershipOnSignIn } from "./membership";
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
  providers: [
    // Discord sends `iss` on the callback (RFC 9207). Without a configured issuer Auth.js
    // compares it against its placeholder "https://authjs.dev" and rejects the sign-in.
    // Only the identity is needed, so no e-mail scope.
    Discord({
      issuer: "https://discord.com",
      authorization: { params: { scope: "identify" } },
    }),
  ],
  session: { strategy: "database" },
  pages: {
    error: "/kein-zugang",
  },
  callbacks: {
    signIn({ account }) {
      if (account?.provider !== "discord") {
        return false;
      }
      return isDiscordIdAllowed(getDb(), account.providerAccountId);
    },
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
  events: {
    signIn({ user, account }) {
      if (!user.id || account?.provider !== "discord") {
        return;
      }
      const db = getDb();
      ensureMembershipOnSignIn(
        db,
        getGuild(db).id,
        user.id,
        account.providerAccountId,
        serverEnv(),
      );
    },
  },
}));
