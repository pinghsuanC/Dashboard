import "server-only";

import { prisma } from "@/services/prisma";

// The database side of the auth flows: plain queries that take arguments and
// return rows. Bcrypt, emails and rate limits stay with the callers in `lib/`.
// Email lookups are case-insensitive: the unique index is not, and
// GitHub-created rows keep the provider's casing.

const byEmail = (email: string) => ({ email: { equals: email, mode: "insensitive" as const } });

/** What the Credentials sign-in checks, or null for an unknown email. */
export const findCredentialUser = (email: string) =>
  prisma.user.findFirst({
    where: byEmail(email),
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

/** The stored email of any user with this address, for register's taken check. */
export const findUserEmail = (email: string) =>
  prisma.user.findFirst({ where: byEmail(email), select: { email: true } });

/** As `findUserEmail`, but only for a user who has a password (reset links). */
export const findPasswordUserEmail = (email: string) =>
  prisma.user.findFirst({
    where: { ...byEmail(email), passwordHash: { not: null } },
    select: { email: true },
  });

/** Throws Prisma's P2002 when the email is already taken. */
export const createPasswordUser = (data: { name: string; email: string; passwordHash: string }) =>
  prisma.user.create({ data, select: { email: true } });

/** The user's email and password hash, for checking the current password. */
export const findPasswordById = (userId: string) =>
  prisma.user.findUnique({ where: { id: userId }, select: { email: true, passwordHash: true } });

/**
 * Stores a new password hash, bumps `sessionVersion` (signing out every
 * session) and deletes the user's outstanding reset links, all at once.
 */
export const setPassword = (userId: string, email: string, passwordHash: string) =>
  prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash, sessionVersion: { increment: 1 } },
    }),
    prisma.passwordResetToken.deleteMany({ where: { email } }),
  ]);
