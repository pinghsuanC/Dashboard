import { requireCurrentUserId } from "@/services/auth/session";
import { prisma } from "@/services/prisma";

/**
 * Deletes the signed-in user and everything they own, all or nothing. The
 * user comes from the session, never an argument, so a user can only delete
 * themselves. Most rows go by the schema's `onDelete: Cascade`; two things
 * don't:
 * - Items are deleted first. `Item.typeId` is ON DELETE RESTRICT, checked
 *   immediately, so cascading into a custom type that still has items would
 *   fail depending on the order Postgres visits them.
 * - Verification and reset tokens are keyed by email, not a relation.
 *
 * Returns false on a database failure rather than throwing. A user that is
 * already gone counts as deleted. A signed-out caller is redirected to sign-in.
 */
export const deleteAccount = async (): Promise<boolean> => {
  // Outside the try: its sign-in redirect must propagate.
  const userId = await requireCurrentUserId();
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
