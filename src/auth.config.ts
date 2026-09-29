import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";

/**
 * The fields `authorize` receives. Only the built-in sign-in page renders
 * them; the custom `/sign-in` form posts the same names.
 */
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
  // Errors (e.g. OAuthAccountNotLinked) land on the sign-in page as `?error=`.
  pages: { signIn: "/sign-in", error: "/sign-in" },
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
