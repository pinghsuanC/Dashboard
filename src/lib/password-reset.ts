import { hash } from "bcryptjs";

import { appOrigin, hashToken, newToken } from "@/lib/auth-tokens";
import { sendPasswordResetEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { BCRYPT_ROUNDS } from "@/lib/register-user";

// Short: a reset link grants the account, unlike a verification link.
const TOKEN_TTL_MS = 60 * 60 * 1000;
// A fresh link is only issued once the last one is this old, so repeated
// submits don't flood the inbox.
const RESEND_COOLDOWN_MS = 2 * 60 * 1000;

/**
 * Mails a reset link if the email belongs to a password user. GitHub-only
 * accounts and unknown emails get nothing, and the caller can't tell which
 * happened: the forgot-password page shows one message either way. Replaces
 * any earlier link. Never throws, so a missing Resend key only logs.
 */
export const requestPasswordReset = async (email: string): Promise<void> => {
  try {
    // Case-insensitive like register: GitHub-created rows keep the provider's
    // casing. The token row stores the email as the user row has it.
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" }, passwordHash: { not: null } },
      select: { email: true },
    });
    if (!user) return;

    const latest = await prisma.passwordResetToken.findFirst({
      where: { email: user.email },
      orderBy: { expires: "desc" },
      select: { expires: true },
    });
    const issuedAt = latest ? latest.expires.getTime() - TOKEN_TTL_MS : 0;
    if (Date.now() - issuedAt < RESEND_COOLDOWN_MS) return;

    const token = newToken();
    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({ where: { email: user.email } }),
      prisma.passwordResetToken.create({
        data: {
          email: user.email,
          token: hashToken(token),
          expires: new Date(Date.now() + TOKEN_TTL_MS),
        },
      }),
    ]);

    const link = `${await appOrigin()}/reset-password?${new URLSearchParams({ token })}`;
    await sendPasswordResetEmail(user.email, link);
  } catch (error) {
    console.error("Sending password reset email failed", error);
  }
};

export type ResetTokenStatus = "valid" | "expired" | "invalid";

/**
 * Read-only check for rendering `/reset-password`. Opening the link uses
 * nothing up, so mail scanners that prefetch it can't burn the token.
 */
export const checkResetToken = async (token: string): Promise<ResetTokenStatus> => {
  const row = await prisma.passwordResetToken.findUnique({
    where: { token: hashToken(token) },
    select: { expires: true },
  });
  if (!row) return "invalid";
  return row.expires < new Date() ? "expired" : "valid";
};

export type ResetResult = "success" | Exclude<ResetTokenStatus, "valid">;

/** One wording for a bad link, on the page and after a failed submit. */
export const RESET_TOKEN_ERRORS: Record<Exclude<ResetTokenStatus, "valid">, string> = {
  expired: "This reset link has expired.",
  invalid: "This reset link is invalid or was already used.",
};

/**
 * Sets the new password and deletes every reset token for the email, so each
 * link works once and older links die with it. The delete's count is the
 * one-time check: two submits racing on one link both find the row, but only
 * one deletes it. A successful reset also verifies the email: the link was
 * mailed there, which proves the same thing a verification link does.
 * Known limitation: sessions are JWTs, so other devices stay signed in until
 * their cookie expires. Revoking them needs a session version on the user.
 */
export const resetPassword = async (token: string, password: string): Promise<ResetResult> => {
  const row = await prisma.passwordResetToken.findUnique({ where: { token: hashToken(token) } });
  if (!row) return "invalid";

  if (row.expires < new Date()) {
    await prisma.passwordResetToken.deleteMany({ where: { token: row.token } });
    return "expired";
  }

  // Hashed before the transaction: bcrypt is slow, and the transaction holds
  // a connection open while it runs.
  const passwordHash = await hash(password, BCRYPT_ROUNDS);

  return prisma.$transaction(async (tx) => {
    const { count } = await tx.passwordResetToken.deleteMany({ where: { token: row.token } });
    if (count === 0) return "invalid";
    await tx.passwordResetToken.deleteMany({ where: { email: row.email } });

    const updated = await tx.user.updateMany({
      where: { email: row.email },
      data: { passwordHash },
    });
    if (updated.count === 0) return "invalid";
    await tx.user.updateMany({
      where: { email: row.email, emailVerified: null },
      data: { emailVerified: new Date() },
    });
    return "success";
  });
};
