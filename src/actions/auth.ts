"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { AuthError } from "next-auth";

import { signIn, signOut } from "@/auth";
import { EmailNotVerifiedError, RateLimitedError } from "@/lib/auth-errors";
import { safeCallbackUrl, signInHref } from "@/lib/auth-redirect";
import {
  forgotPasswordSchema,
  registerSchema,
  resetPasswordSchema,
  signInSchema,
} from "@/lib/auth-schemas";
import { AUTH_MESSAGES, RESET_TOKEN_ERRORS } from "@/lib/constants/messages/auth";
import { SOMETHING_WENT_WRONG } from "@/lib/constants/messages/common";
import type { RateLimitPolicy } from "@/lib/constants/rate-limits";
import { FLAGS, flagParams, ROUTES, withFlag } from "@/lib/constants/routes";
import { resendVerificationLink } from "@/lib/email-verification";
import { fieldErrorsOf } from "@/lib/form-errors";
import { requestPasswordReset, resetPassword } from "@/lib/password-reset";
import { checkRateLimit, rateLimitMessage } from "@/lib/rate-limit";
import { registerPasswordUser } from "@/lib/register-user";
import type { FormState } from "@/types/forms";

/**
 * Counts one attempt by this caller's IP; over the limit, the form state that
 * toasts the wait. Runs after validation, so a typo doesn't use up a try.
 */
const rateLimited = async (policy: RateLimitPolicy): Promise<FormState | null> => {
  const limit = await checkRateLimit(policy, await headers());
  return limit.success ? null : { toast: rateLimitMessage(limit.reset) };
};

/**
 * Credentials sign-in. On success `signIn` throws Next's redirect, which must
 * propagate — only AuthError is caught and turned into a message. Wrong
 * password and unknown email share one message on purpose. The sign-in limit
 * is checked in `authorize`, which throws `RateLimitedError` back to here.
 */
export const signInWithCredentials = async (
  _prev: FormState,
  formData: FormData,
): Promise<FormState> => {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: AUTH_MESSAGES.invalidCredentials };

  try {
    await signIn("credentials", {
      ...parsed.data,
      redirectTo: safeCallbackUrl(formData.get("callbackUrl")),
    });
  } catch (error) {
    if (error instanceof RateLimitedError) {
      return { toast: rateLimitMessage(error.reset) };
    }
    if (error instanceof EmailNotVerifiedError) {
      // Over the resend limit, the email is skipped but the answer stays the same.
      const resend = await checkRateLimit("resendVerification", await headers(), error.email);
      if (resend.success) await resendVerificationLink(error.email);
      return { error: AUTH_MESSAGES.verifyEmailFirst };
    }
    if (error instanceof AuthError) {
      return {
        error:
          error.type === "CredentialsSignin" ? AUTH_MESSAGES.invalidCredentials : SOMETHING_WENT_WRONG,
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

  const limited = await rateLimited("register");
  if (limited) return limited;

  const result = await registerPasswordUser(parsed.data);
  if (!result.success) return { error: result.error };

  // Outside any try/catch: redirect() works by throwing.
  redirect(signInHref(safeCallbackUrl(formData.get("callbackUrl")), flagParams(FLAGS.registered)));
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

  // Keyed by IP only, so being limited says nothing about the email.
  const limited = await rateLimited("forgotPassword");
  if (limited) return limited;

  after(() => requestPasswordReset(parsed.data.email));
  redirect(withFlag(ROUTES.forgotPassword, FLAGS.sent));
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

  const limited = await rateLimited("resetPassword");
  if (limited) return limited;

  const result = await resetPassword(parsed.data.token, parsed.data.password);
  if (result !== "success") return { error: RESET_TOKEN_ERRORS[result] };

  redirect(signInHref(undefined, flagParams(FLAGS.reset)));
};

export const signInWithGitHub = async (formData: FormData) => {
  await signIn("github", { redirectTo: safeCallbackUrl(formData.get("callbackUrl")) });
};

export const signOutAction = async () => {
  await signOut({ redirectTo: ROUTES.signIn });
};
