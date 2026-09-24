import { cache } from "react";

import { MOCK_USER } from "@/lib/mock-data";
import { prisma } from "@/lib/prisma";

/**
 * KNOWN DEVIATION: there is no auth yet, so every query is scoped to the seeded
 * demo user, found by the email `prisma db seed` gives it. Replace this with
 * the session user once Auth.js lands.
 *
 * `cache` dedupes the lookup when several fetchers need the id in one request.
 */
export const getDemoUserId = cache(async (): Promise<string> => {
  const user = await prisma.user.findUnique({
    where: { email: MOCK_USER.email },
    select: { id: true },
  });
  if (!user) {
    throw new Error(
      `Demo user ${MOCK_USER.email} not found. Seed the database with \`npx prisma db seed\`.`,
    );
  }
  return user.id;
});
