import { compare, hash } from "bcryptjs";

import { BCRYPT_ROUNDS } from "@/lib/constants/security";
import { requireCurrentUserId } from "@/services/auth/session";
import { findPasswordById, setPassword } from "@/services/auth/users";
import type { ChangePasswordResult } from "@/types/auth";

/**
 * Checks the signed-in user's current password, then stores the new one. The
 * user comes from the session, never an argument, so no one can change
 * another account's password. A user without a password (GitHub-only) gets
 * "no-password": the settings page hides the form for them, but the action can
 * still be called directly. A database failure is "error", so the form can
 * say so instead of crashing; a signed-out caller is redirected to sign-in.
 *
 * Also bumps `sessionVersion`, which signs out every existing session,
 * including the caller's (the action signs it back in), and deletes any reset
 * links still outstanding, so one requested before the change can't undo it.
 */
export const changePassword = async (
  currentPassword: string,
  newPassword: string,
): Promise<ChangePasswordResult> => {
  // Outside the try: its sign-in redirect must propagate.
  const userId = await requireCurrentUserId();
  try {
    const user = await findPasswordById(userId);
    if (!user?.passwordHash) return "no-password";
    if (!(await compare(currentPassword, user.passwordHash))) return "wrong-password";

    await setPassword(userId, user.email, await hash(newPassword, BCRYPT_ROUNDS));
    return "success";
  } catch (error) {
    console.error("Changing password failed", error);
    return "error";
  }
};
