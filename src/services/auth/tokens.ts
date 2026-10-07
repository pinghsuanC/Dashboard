import "server-only";

import { prisma } from "@/services/prisma";

// Verification and password-reset token rows. Tokens arrive already hashed;
// expiry and cooldown rules stay with the callers in `lib/`. Each consume is
// one transaction, and its delete's count is the one-time check: two requests
// racing on one link both find the row, but only one deletes it.

// --- Email verification ---

/** Replaces every verification token for the email with this one. */
export const replaceVerificationToken = (email: string, tokenHash: string, expires: Date) =>
  prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { identifier: email } }),
    prisma.verificationToken.create({ data: { identifier: email, token: tokenHash, expires } }),
  ]);

/** The expiry of the newest verification token for the email, if any. */
export const latestVerificationExpiry = async (email: string): Promise<Date | null> => {
  const latest = await prisma.verificationToken.findFirst({
    where: { identifier: email },
    orderBy: { expires: "desc" },
    select: { expires: true },
  });
  return latest?.expires ?? null;
};

export const findVerificationToken = (tokenHash: string) =>
  prisma.verificationToken.findUnique({ where: { token: tokenHash } });

export const deleteVerificationToken = (tokenHash: string) =>
  prisma.verificationToken.deleteMany({ where: { token: tokenHash } });

/**
 * Uses the token up and marks its email verified. False when another request
 * used it first.
 */
export const consumeVerificationToken = (tokenHash: string, email: string) =>
  prisma.$transaction(async (tx) => {
    const { count } = await tx.verificationToken.deleteMany({ where: { token: tokenHash } });
    if (count === 0) return false;
    await tx.user.updateMany({
      where: { email, emailVerified: null },
      data: { emailVerified: new Date() },
    });
    return true;
  });

// --- Password reset ---

/** Replaces every reset token for the email with this one. */
export const replaceResetToken = (email: string, tokenHash: string, expires: Date) =>
  prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { email } }),
    prisma.passwordResetToken.create({ data: { email, token: tokenHash, expires } }),
  ]);

/** The expiry of the newest reset token for the email, if any. */
export const latestResetExpiry = async (email: string): Promise<Date | null> => {
  const latest = await prisma.passwordResetToken.findFirst({
    where: { email },
    orderBy: { expires: "desc" },
    select: { expires: true },
  });
  return latest?.expires ?? null;
};

export const findResetToken = (tokenHash: string) =>
  prisma.passwordResetToken.findUnique({ where: { token: tokenHash } });

export const deleteResetToken = (tokenHash: string) =>
  prisma.passwordResetToken.deleteMany({ where: { token: tokenHash } });

/**
 * Uses the token up, deletes the email's other reset links, sets the password,
 * bumps `sessionVersion` and verifies the email. False when another request
 * used the token first or the user is gone.
 */
export const consumeResetToken = (tokenHash: string, email: string, passwordHash: string) =>
  prisma.$transaction(async (tx) => {
    const { count } = await tx.passwordResetToken.deleteMany({ where: { token: tokenHash } });
    if (count === 0) return false;
    await tx.passwordResetToken.deleteMany({ where: { email } });

    const updated = await tx.user.updateMany({
      where: { email },
      data: { passwordHash, sessionVersion: { increment: 1 } },
    });
    if (updated.count === 0) return false;
    await tx.user.updateMany({
      where: { email, emailVerified: null },
      data: { emailVerified: new Date() },
    });
    return true;
  });
