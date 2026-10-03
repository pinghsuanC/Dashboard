import { hash } from "bcryptjs";

import { appOrigin, hashToken, newToken } from "@/lib/auth-tokens";
import { RESET_RESEND_COOLDOWN_MS, RESET_TOKEN_TTL_MS } from "@/lib/constants/limits";
import { ROUTES } from "@/lib/constants/routes";
import { BCRYPT_ROUNDS } from "@/lib/constants/security";
import { sendPasswordResetEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

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
    const issuedAt = latest ? latest.expires.getTime() - RESET_TOKEN_TTL_MS : 0;
    if (Date.now() - issuedAt < RESET_RESEND_COOLDOWN_MS) return;

    const token = newToken();
    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({ where: { email: user.email } }),
      prisma.passwordResetToken.create({
        data: {
          email: user.email,
          token: hashToken(token),
          expires: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        },
      }),
    ]);

    const link = `${await appOrigin()}${ROUTES.resetPassword}?${new URLSearchParams({ token })}`;
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

/**
 * Sets the new password and deletes every reset token for the email, so each
 * link works once and older links die with it. The delete's count is the
 * one-time check: two submits racing on one link both find the row, but only
 * one deletes it. A successful reset also verifies the email: the link was
 * mailed there, which proves the same thing a verification link does.
 * Bumps `sessionVersion`, so every session issued before the reset, such as
 * one stolen by whoever made the reset necessary, is signed out.
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
      data: { passwordHash, sessionVersion: { increment: 1 } },
    });
    if (updated.count === 0) return "invalid";
    await tx.user.updateMany({
      where: { email: row.email, emailVerified: null },
      data: { emailVerified: new Date() },
    });
    return "success";
  });
};
