import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";

import authConfig from "@/auth.config";
import { prisma } from "@/lib/prisma";

// Full config for the Node runtime. The adapter creates the User and Account
// rows on first GitHub sign-in; `jwt` keeps sessions off the database, which
// is also what lets the proxy verify them without Prisma.
export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  ...authConfig,
});
