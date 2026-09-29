import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";

/**
 * Edge-safe half of the Auth.js config: no adapter, no Prisma. `proxy.ts`
 * builds its own `auth()` from this alone; `auth.ts` spreads it and adds the
 * database pieces. GitHub reads AUTH_GITHUB_ID / AUTH_GITHUB_SECRET itself.
 */
export default {
  providers: [GitHub],
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
