import { compare } from "bcryptjs";

import { EmailNotVerifiedError } from "@/lib/auth-errors";
import { signInSchema } from "@/lib/auth-schemas";
import { isEmailVerificationEnabled } from "@/lib/email-verification";
import { prisma } from "@/lib/prisma";

/**
 * The Credentials provider's `authorize`, in its own module so it can be
 * tested without building NextAuth. Returning null makes Auth.js answer with
 * a generic CredentialsSignin error, so a wrong password and an unknown email
 * look the same to the caller. Known issue: an unknown email skips bcrypt and
 * returns faster, so response time still shows whether an email is
 * registered. Register no longer does; fixing this needs a compare against a
 * dummy hash (auth audit M4, scheduled with rate limiting).
 *
 * The returned `sessionVersion` is what the `jwt` callback stamps into the
 * token. Leave it out and every token gets 0, which stops matching the user
 * row after their first password change.
 */
export const authorizeCredentials = async (input: unknown) => {
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
      sessionVersion: true,
    },
  });
  if (!user?.passwordHash) return null;

  const valid = await compare(parsed.data.password, user.passwordHash);
  if (!valid) return null;

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
