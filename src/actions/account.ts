"use server";

import { redirect } from "next/navigation";

import { signOut } from "@/auth";
import { changePassword, deleteAccount } from "@/lib/account";
import { changePasswordSchema } from "@/lib/auth-schemas";
import { requireCurrentUserId } from "@/lib/db/current-user";
import { fieldErrorsOf } from "@/lib/form-errors";
import type { FormState } from "@/types/forms";

const SOMETHING_WENT_WRONG = "Something went wrong. Please try again.";

/** Back to the profile page with a one-shot flag, which shows a toast. */
export const changePasswordAction = async (
  _prev: FormState,
  formData: FormData,
): Promise<FormState> => {
  const userId = await requireCurrentUserId();
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  const result = await changePassword(userId, parsed.data.currentPassword, parsed.data.password);
  if (result === "wrong-password") {
    return { fieldErrors: { currentPassword: "Current password is incorrect" } };
  }
  if (result === "no-password") return { error: "This account signs in with GitHub." };
  if (result === "error") return { error: SOMETHING_WENT_WRONG };

  // Outside any try/catch: redirect() works by throwing.
  redirect("/profile?password=changed");
};

/**
 * The session id, never a submitted one: a user can only delete themselves.
 * Signs out only once the delete succeeded; a failure keeps the user signed
 * in, on the dialog, with a message.
 */
export const deleteAccountAction = async (): Promise<FormState> => {
  const userId = await requireCurrentUserId();
  if (!(await deleteAccount(userId))) return { error: SOMETHING_WENT_WRONG };

  await signOut({ redirectTo: "/sign-in?deleted=1" });
  return {};
};
