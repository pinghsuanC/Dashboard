import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";

import authConfig, { credentialFields } from "@/auth.config";
import { EmailNotVerifiedError } from "@/lib/auth-errors";
import { signInSchema } from "@/lib/auth-schemas";
import { prisma } from "@/lib/prisma";

// Replaces the placeholder in `auth.config.ts`. Returning null makes Auth.js
// answer with a generic CredentialsSignin error, so a wrong password and an
// unknown email look the same to the caller. Known issue: an unknown email
// skips bcrypt and returns faster; accepted, since /api/auth/register already
// reveals whether an email exists.
const credentials = Credentials({
  credentials: credentialFields,
  authorize: async (input) => {
    const parsed = signInSchema.safeParse(input);
    if (!parsed.success) return null;

    // Case-insensitive: GitHub-created rows keep the provider's casing.
    const user = await prisma.user.findFirst({
      where: { email: { equals: parsed.data.email, mode: "insensitive" } },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        passwordHash: true,
        emailVerified: true,
      },
    });
    if (!user?.passwordHash) return null;

    const valid = await compare(parsed.data.password, user.passwordHash);
    if (!valid) return null;

    // Checked after the password, so only the account owner learns the email
    // is registered but unverified.
    if (!user.emailVerified) throw new EmailNotVerifiedError(user.email);

    return { id: user.id, name: user.name, email: user.email, image: user.image };
  },
});

// Full config for the Node runtime. The adapter creates the User and Account
// rows on first GitHub sign-in; `jwt` keeps sessions off the database, which
// is also what lets the proxy verify them without Prisma. Credentials never
// goes through the adapter — `authorize` returns the user and its id becomes
// the token's `sub`. The provider list mirrors `auth.config.ts` with the real
// Credentials swapped in — add new providers to both.
export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  ...authConfig,
  providers: [GitHub, credentials],
});
