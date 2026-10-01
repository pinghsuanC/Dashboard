import { requireCurrentUserId } from "@/lib/db/current-user";
import { prisma } from "@/lib/prisma";

/** What the profile page needs beyond `CurrentUser`. */
export interface ProfileDetails {
  createdAt: Date;
  /** Whether the user can sign in with a password. Never the hash itself. */
  hasPassword: boolean;
}

/**
 * Kept out of `getCurrentUser()`: every page loads that, and only the profile
 * page needs these. Keyed off `passwordHash`, not the linked provider, so a
 * GitHub user who later set a password can change it too.
 */
export const getProfileDetails = async (): Promise<ProfileDetails> => {
  const userId = await requireCurrentUserId();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { createdAt: true, passwordHash: true },
  });
  return { createdAt: user.createdAt, hasPassword: user.passwordHash !== null };
};
