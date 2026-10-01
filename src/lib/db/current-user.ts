import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "@/auth";
import type { Plan } from "@/generated/prisma/client";
import { signInHref } from "@/lib/auth-redirect";
import { prisma } from "@/lib/prisma";

/** The signed-in user's profile, safe to hand to client components. */
export interface CurrentUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  plan: Plan;
  isPro: boolean;
  preferredTheme: string;
  preferredFontSize: number;
}

/**
 * Loads the profile of the session user from the database. It runs on every
 * request rather than living in the JWT, so plan or preference changes show up
 * on the next load while the token is still valid. `select` keeps
 * passwordHash and the Stripe ids from ever reaching the client.
 *
 * Returns null when there is no session, or when the token points at a user
 * that no longer exists.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      plan: true,
      preferredTheme: true,
      preferredFontSize: true,
    },
  });
  if (!user) return null;

  return { ...user, isPro: user.plan === "PRO" };
});

/**
 * The session user's id, for scoping queries. Redirects to sign-in when there
 * is none: a layout and its page render concurrently, so a page's queries
 * can't rely on the layout's own redirect having run first.
 */
export const requireCurrentUserId = async (): Promise<string> => {
  const user = await requireCurrentUser();
  return user.id;
};

/** Like `requireCurrentUserId`, for pages that render the profile itself. */
export const requireCurrentUser = async (): Promise<CurrentUser> => {
  const user = await getCurrentUser();
  if (!user) redirect(signInHref());
  return user;
};
