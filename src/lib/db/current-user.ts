import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "@/auth";
import type { Plan } from "@/generated/prisma/client";
import { signInHref } from "@/lib/auth-redirect";
import { DEFAULT_SIGN_IN_REDIRECT } from "@/lib/constants/routes";
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
  createdAt: Date;
  /** Whether the user can sign in with a password. Never the hash itself. */
  hasPassword: boolean;
}

/**
 * Who is signed in, and their profile, in one read of the user row. It does
 * two jobs on purpose: it is the auth check (guards, actions, auth pages) and
 * the user session's profile source. Cached per request, so every caller in
 * one render shares the single query.
 *
 * Checks the database, not just the JWT: a valid token whose user row is gone
 * (e.g. deleted) returns null, and so does one issued before the user's last
 * password change or reset (its `sessionVersion` is behind the row's). The
 * proxy only verifies the JWT, so a revoked cookie still gets past it and is
 * turned away here. `select` keeps the Stripe ids out, and the password hash
 * is read only to become `hasPassword` (keyed off the hash, not
 * the linked provider, so a GitHub user who later set a password counts).
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
      createdAt: true,
      passwordHash: true,
      sessionVersion: true,
    },
  });
  if (!user) return null;

  const { passwordHash, sessionVersion, ...profile } = user;
  if (sessionVersion !== (session.sessionVersion ?? 0)) return null;
  return { ...profile, isPro: profile.plan === "PRO", hasPassword: passwordHash !== null };
});

/**
 * The signed-in user, or a redirect to sign-in. A layout and its page render
 * concurrently, so a page's queries can't rely on the layout's own redirect
 * having run first.
 */
export const requireCurrentUser = async (): Promise<CurrentUser> => {
  const user = await getCurrentUser();
  if (!user) redirect(signInHref());
  return user;
};

/** The signed-in user's id, for scoping queries and actions. */
export const requireCurrentUserId = async (): Promise<string> => {
  const user = await requireCurrentUser();
  return user.id;
};

/**
 * For the sign-in, register and password pages: someone already signed in
 * goes into the app instead, where the `(app)` layout loads their session.
 * A token for a deleted user is not "signed in", so it stays here rather than
 * bouncing between this page and the layout.
 */
export const redirectIfSignedIn = async (
  destination: string = DEFAULT_SIGN_IN_REDIRECT,
): Promise<void> => {
  if (await getCurrentUser()) redirect(destination);
};
