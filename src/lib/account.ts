import { compare, hash } from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { BCRYPT_ROUNDS } from "@/lib/register-user";

export type ChangePasswordResult = "success" | "wrong-password" | "no-password" | "error";

/**
 * Checks the current password, then stores the new one. A user without a
 * password (GitHub-only) gets "no-password": the profile page hides the form
 * for them, but the action can still be called directly. Never throws: a
 * database failure is "error", so the form can say so instead of crashing.
 * Known limitation: sessions are JWTs, so other devices stay signed in.
 */
export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<ChangePasswordResult> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (!user?.passwordHash) return "no-password";
    if (!(await compare(currentPassword, user.passwordHash))) return "wrong-password";

    const passwordHash = await hash(newPassword, BCRYPT_ROUNDS);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    return "success";
  } catch (error) {
    console.error("Changing password failed", error);
    return "error";
  }
};

/**
 * Deletes the user and everything they own, all or nothing. Most rows go by
 * the schema's `onDelete: Cascade`; two things don't:
 * - Items are deleted first. `Item.typeId` is ON DELETE RESTRICT, checked
 *   immediately, so cascading into a custom type that still has items would
 *   fail depending on the order Postgres visits them.
 * - Verification and reset tokens are keyed by email, not a relation.
 *
 * Returns false on a database failure rather than throwing. A user that is
 * already gone counts as deleted.
 */
export const deleteAccount = async (userId: string): Promise<boolean> => {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!user) return true;

    await prisma.$transaction([
      prisma.item.deleteMany({ where: { userId } }),
      prisma.verificationToken.deleteMany({ where: { identifier: user.email } }),
      prisma.passwordResetToken.deleteMany({ where: { email: user.email } }),
      prisma.user.delete({ where: { id: userId } }),
    ]);
    return true;
  } catch (error) {
    console.error("Deleting account failed", error);
    return false;
  }
};
