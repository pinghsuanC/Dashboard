import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";

/** Fields NextAuth's default sign-in page renders for the Credentials form. */
export const credentialFields = {
  email: { label: "Email", type: "email" },
  password: { label: "Password", type: "password" },
};

/**
 * Edge-safe half of the Auth.js config: no adapter, no Prisma. `proxy.ts`
 * builds its own `auth()` from this alone; `auth.ts` spreads it and adds the
 * database pieces. GitHub reads AUTH_GITHUB_ID / AUTH_GITHUB_SECRET itself.
 * Credentials is a placeholder here — bcrypt and the DB lookup live in
 * `auth.ts`, which replaces it.
 */
export default {
  providers: [GitHub, Credentials({ credentials: credentialFields, authorize: () => null })],
  callbacks: {
    // With the JWT strategy the token only carries identity: `sub` is the
    // adapter's User.id. The profile itself is read from the DB per request
    // by `getCurrentUser()`, so it never goes stale inside the cookie.
    session: ({ session, token }) => {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
} satisfies NextAuthConfig;
