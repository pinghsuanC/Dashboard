"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";

import { signIn, signOut } from "@/auth";
import { changePassword } from "@/lib/auth/account";
import { signInHref } from "@/lib/auth/auth-redirect";
import { changePasswordSchema } from "@/lib/auth/auth-schemas";
import { rateLimitMessage } from "@/lib/auth/rate-limit-messages";
import { ACCOUNT_MESSAGES } from "@/lib/constants/messages/account";
import { SOMETHING_WENT_WRONG } from "@/lib/constants/messages/common";
import { API_ROUTES, FLAGS, ROUTES, withFlag } from "@/lib/constants/routes";
import { deleteAccount } from "@/lib/db/users";
import { fieldErrorsOf } from "@/lib/helpers/form-errors";
import { requireCurrentUser } from "@/services/auth/session";
import { checkRateLimit } from "@/services/rate-limit";
import type { DeleteAccountState, FormState } from "@/types/forms";

const PASSWORD_CHANGED = withFlag(ROUTES.settings, FLAGS.passwordChanged);

/**
 * Back to the settings page with a one-shot flag, which shows a toast. The
 * change signs out every session, this one included, so it signs this device
 * back in with the new password: a fresh cookie carrying the new version.
 */
export const changePasswordAction = async (
  _prev: FormState,
  formData: FormData,
): Promise<FormState> => {
  const { id, email } = await requireCurrentUser();
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  // Per user alone (`perIp: false`), before the bcrypt compare: a stolen
  // session cookie gets no more guesses from a fresh IP.
  const limit = await checkRateLimit("changePassword", await headers(), id);
  if (!limit.success) return { toast: rateLimitMessage(limit.reset) };

  const result = await changePassword(parsed.data.currentPassword, parsed.data.password);
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
 * `deleteAccount` takes the user from the session, never a submitted id: a
 * user can only delete themselves. Signs out only once the delete succeeded;
 * a failure keeps the user signed in, on the dialog, with a message.
 *
 * Signs out without redirecting: the dialog loads `leaveTo`, the signed-out
 * route, in the browser so its `Clear-Site-Data` reaches it (a redirect from
 * here would be followed on the server), and that route goes on to
 * `/sign-in?deleted=1`.
 */
export const deleteAccountAction = async (): Promise<DeleteAccountState> => {
  if (!(await deleteAccount())) return { error: SOMETHING_WENT_WRONG };

  await signOut({ redirect: false });
  return { leaveTo: withFlag(API_ROUTES.signedOut, FLAGS.deleted) };
};
