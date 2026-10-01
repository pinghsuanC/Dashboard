"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { AuthError } from "next-auth";
import type { z } from "zod";

import { signIn, signOut } from "@/auth";
import { EmailNotVerifiedError } from "@/lib/auth-errors";
import { safeCallbackUrl, signInHref } from "@/lib/auth-redirect";
import {
  forgotPasswordSchema,
  registerSchema,
  resetPasswordSchema,
  signInSchema,
} from "@/lib/auth-schemas";
import { resendVerificationLink } from "@/lib/email-verification";
import { RESET_TOKEN_ERRORS, requestPasswordReset, resetPassword } from "@/lib/password-reset";
import { registerPasswordUser } from "@/lib/register-user";
import type { FormState } from "@/types/forms";

/** First message per field, in the shape `ActionForm` reads. */
const fieldErrorsOf = (error: z.ZodError): FormState["fieldErrors"] => {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    fieldErrors[String(issue.path[0])] ??= issue.message;
  }
  return fieldErrors;
};

/**
 * Credentials sign-in. On success `signIn` throws Next's redirect, which must
 * propagate — only AuthError is caught and turned into a message. Wrong
 * password and unknown email share one message on purpose.
 */
export const signInWithCredentials = async (
  _prev: FormState,
  formData: FormData,
): Promise<FormState> => {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Invalid email or password" };

  try {
    await signIn("credentials", {
      ...parsed.data,
      redirectTo: safeCallbackUrl(formData.get("callbackUrl")),
    });
  } catch (error) {
    if (error instanceof EmailNotVerifiedError) {
      await resendVerificationLink(error.email);
      return { error: "Verify your email before signing in. Check your inbox for the link." };
    }
    if (error instanceof AuthError) {
      return {
        error:
          error.type === "CredentialsSignin"
            ? "Invalid email or password"
            : "Something went wrong. Please try again.",
      };
    }
    throw error;
  }
  return {};
};

/**
 * Creates the account and mails the verification link (unless
 * `EMAIL_VERIFICATION=off`), then sends the user to sign in, where a toast
 * says what to do next.
 */
export const registerWithCredentials = async (
  _prev: FormState,
  formData: FormData,
): Promise<FormState> => {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  const result = await registerPasswordUser(parsed.data);
  if (!result.success) return { error: result.error };

  // Outside any try/catch: redirect() works by throwing.
  redirect(signInHref(safeCallbackUrl(formData.get("callbackUrl")), { registered: "1" }));
};

/**
 * Always lands on the same "check your inbox" message. The lookup and the
 * email run in `after()`, once the response is sent, so an existing account
 * doesn't answer slower than an unknown email.
 */
export const requestPasswordResetAction = async (
  _prev: FormState,
  formData: FormData,
): Promise<FormState> => {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  after(() => requestPasswordReset(parsed.data.email));
  redirect("/forgot-password?sent=1");
};

/** Sets the new password, then sends the user to sign in with it. */
export const resetPasswordAction = async (
  _prev: FormState,
  formData: FormData,
): Promise<FormState> => {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    const fieldErrors = fieldErrorsOf(parsed.error);
    return fieldErrors?.token ? { error: RESET_TOKEN_ERRORS.invalid } : { fieldErrors };
  }

  const result = await resetPassword(parsed.data.token, parsed.data.password);
  if (result !== "success") return { error: RESET_TOKEN_ERRORS[result] };

  redirect(signInHref(undefined, { reset: "1" }));
};

export const signInWithGitHub = async (formData: FormData) => {
  await signIn("github", { redirectTo: safeCallbackUrl(formData.get("callbackUrl")) });
};

export const signOutAction = async () => {
  await signOut({ redirectTo: "/sign-in" });
};
