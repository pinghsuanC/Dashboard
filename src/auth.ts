import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";

import authConfig, { credentialFields } from "@/auth.config";
import { authorizeCredentials } from "@/lib/auth/authorize-credentials";
import { authAdapter } from "@/services/auth/adapter";

// Replaces the placeholder in `auth.config.ts`; the check itself is in
// `authorize-credentials.ts`.
const credentials = Credentials({
  credentials: credentialFields,
  authorize: authorizeCredentials,
});

// Full config for the Node runtime. The adapter creates the User and Account
// rows on first GitHub sign-in; `jwt` keeps sessions off the database, which
// is also what lets the proxy verify them without Prisma. Credentials never
// goes through the adapter — `authorize` returns the user and its id becomes
// the token's `sub`. The provider list mirrors `auth.config.ts` with the real
// Credentials swapped in — add new providers to both.
export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: authAdapter,
  session: { strategy: "jwt" },
  ...authConfig,
  providers: [GitHub, credentials],
});
