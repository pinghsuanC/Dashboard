import { compare } from "bcryptjs";

import { EmailNotVerifiedError, RateLimitedError } from "@/lib/auth-errors";
import { DUMMY_HASH } from "@/lib/constants/security";
import { signInSchema } from "@/lib/auth-schemas";
import { isEmailVerificationEnabled } from "@/lib/email-verification";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * The Credentials provider's `authorize`, in its own module so it can be
 * tested without building NextAuth. Returning null makes Auth.js answer with
 * a generic CredentialsSignin error, so a wrong password and an unknown email
 * look the same to the caller. An unknown email still runs bcrypt (against
 * a dummy hash), so response time doesn't tell them apart either.
 *
 * Rate limited per IP + email before anything else, so it also covers a
 * direct POST to `/api/auth/callback/credentials` that skips the server
 * action. Auth.js passes the request; from a server action it carries that
 * request's headers. Over the limit it throws for any email, registered or
 * not.
 *
 * The returned `sessionVersion` is what the `jwt` callback stamps into the
 * token. Leave it out and every token gets 0, which stops matching the user
 * row after their first password change.
 */
export const authorizeCredentials = async (input: unknown, request?: Request) => {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return null;

  const limit = await checkRateLimit("signIn", request?.headers ?? new Headers(), parsed.data.email);
  if (!limit.success) throw new RateLimitedError(limit.reset);

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
      sessionVersion: true,
    },
  });
  const valid = await compare(parsed.data.password, user?.passwordHash ?? DUMMY_HASH);
  if (!valid || !user?.passwordHash) return null;

  // Checked after the password, so only the account owner learns the email
  // is registered but unverified.
  if (!user.emailVerified && isEmailVerificationEnabled()) {
    throw new EmailNotVerifiedError(user.email);
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    sessionVersion: user.sessionVersion,
  };
};
