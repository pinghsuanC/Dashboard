"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";

import { signIn, signOut } from "@/auth";
import { changePassword, deleteAccount } from "@/lib/account";
import { signInHref } from "@/lib/auth-redirect";
import { changePasswordSchema } from "@/lib/auth-schemas";
import { ACCOUNT_MESSAGES } from "@/lib/constants/messages/account";
import { SOMETHING_WENT_WRONG } from "@/lib/constants/messages/common";
import { FLAGS, ROUTES, withFlag } from "@/lib/constants/routes";
import { requireCurrentUser, requireCurrentUserId } from "@/lib/db/current-user";
import { fieldErrorsOf } from "@/lib/form-errors";
import type { FormState } from "@/types/forms";

const PASSWORD_CHANGED = withFlag(ROUTES.profile, FLAGS.passwordChanged);

/**
 * Back to the profile page with a one-shot flag, which shows a toast. The
 * change signs out every session, this one included, so it signs this device
 * back in with the new password: a fresh cookie carrying the new version.
 */
export const changePasswordAction = async (
  _prev: FormState,
  formData: FormData,
): Promise<FormState> => {
  const { id: userId, email } = await requireCurrentUser();
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  const result = await changePassword(userId, parsed.data.currentPassword, parsed.data.password);
  if (result === "wrong-password") {
    return { fieldErrors: { currentPassword: ACCOUNT_MESSAGES.currentPasswordIncorrect } };
  }
  if (result === "no-password") return { error: ACCOUNT_MESSAGES.githubOnlyAccount };
  if (result === "error") return { error: SOMETHING_WENT_WRONG };

  try {
    // Throws Next's redirect on success, which must propagate.
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirectTo: PASSWORD_CHANGED,
    });
  } catch (error) {
    if (!(error instanceof AuthError)) throw error;
    // The password is saved, but `authorize` refused: in practice an account
    // registered while EMAIL_VERIFICATION was off and still unverified. Its
    // old session is revoked, so send it to sign in, which mails the link.
  }
  redirect(signInHref(PASSWORD_CHANGED));
};

/**
 * The session id, never a submitted one: a user can only delete themselves.
 * Signs out only once the delete succeeded; a failure keeps the user signed
 * in, on the dialog, with a message.
 */
export const deleteAccountAction = async (): Promise<FormState> => {
  const userId = await requireCurrentUserId();
  if (!(await deleteAccount(userId))) return { error: SOMETHING_WENT_WRONG };

  await signOut({ redirectTo: withFlag(ROUTES.signIn, FLAGS.deleted) });
  return {};
};
