import "server-only";

import { PrismaAdapter } from "@auth/prisma-adapter";

import { prisma } from "@/services/prisma";

/**
 * Creates the User and Account rows on first GitHub sign-in. Kept apart from
 * `session.ts`: that module imports `@/auth`, which imports this one, so one
 * file holding both would import itself while loading.
 */
export const authAdapter = PrismaAdapter(prisma);
