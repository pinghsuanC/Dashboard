import { hash } from "bcryptjs";
import type { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import type { registerSchema } from "@/lib/auth-schemas";
import { appOrigin } from "@/lib/auth-tokens";
import { sendAccountExistsEmail } from "@/lib/email";
import { isEmailVerificationEnabled, sendVerificationLink } from "@/lib/email-verification";
import { prisma } from "@/lib/prisma";

// Shared with password reset, so both writers of `passwordHash` use one cost.
export const BCRYPT_ROUNDS = 12;

/**
 * The same for a new email and a taken one, so registering can't be used to
 * check whether someone has an account. No user id either: it would only
 * exist in one of the two cases.
 */
export type RegisterResult = { success: true } | { success: false; error: string; status: 500 };

/**
 * Tells the owner of a taken email that someone tried to register with it.
 * Only when verification is on: with it off the app may have no Resend key,
 * and a new account gets no email either, so skipping keeps the two alike.
 * Known issue: nothing limits how often this goes out to one address; the
 * planned rate limiting on register covers it.
 */
const notifyExistingAccount = async (email: string): Promise<void> => {
  if (!isEmailVerificationEnabled()) return;
  const origin = await appOrigin();
  await sendAccountExistsEmail(email, `${origin}/sign-in`, `${origin}/forgot-password`);
};

/**
 * Creates a password user from already-validated input. Shared by
 * `POST /api/auth/register` and the register page's server action.
 *
 * A taken email answers exactly like a new one. The owner gets an email
 * instead of a verification link, and the password is hashed anyway, so the
 * slow bcrypt step doesn't make a new account answer measurably slower.
 */
export const registerPasswordUser = async ({
  name,
  email,
  password,
}: z.output<typeof registerSchema>): Promise<RegisterResult> => {
  try {
    const passwordHash = await hash(password, BCRYPT_ROUNDS);

    // Case-insensitive: the unique index is not, and GitHub-created rows keep
    // the provider's casing.
    const existing = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { email: true },
    });
    if (existing) {
      await notifyExistingAccount(existing.email).catch((error: unknown) =>
        console.error("Sending account-exists email failed", error),
      );
      return { success: true };
    }

    const user = await prisma.user.create({
      data: { name, email, passwordHash },
      select: { email: true },
    });
    // A failed send doesn't undo the account: signing in with the right
    // password mails a fresh link.
    if (isEmailVerificationEnabled()) {
      await sendVerificationLink(user.email).catch((error: unknown) =>
        console.error("Sending verification email failed", error),
      );
    }
    return { success: true };
  } catch (error) {
    // Two requests racing past the check above: the other one created it.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { success: true };
    }
    console.error("Registration failed", error);
    return { success: false, error: "Registration failed", status: 500 };
  }
};
