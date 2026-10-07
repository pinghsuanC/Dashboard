import { PASSWORD_MIN_LENGTH } from "@/lib/constants/limits";
import type { VerifyNotice } from "@/types/auth";

/** Form and action messages for sign-in, register and password reset. */
export const AUTH_MESSAGES = {
  // Validation (auth-schemas.ts)
  invalidEmail: "Enter a valid email",
  passwordTooShort: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
  passwordTooLong: "Password is too long",
  nameRequired: "Name is required",
  passwordsDontMatch: "Passwords do not match",

  // Actions. A wrong password and an unknown email share one message on purpose.
  invalidCredentials: "Invalid email or password",
  verifyEmailFirst: "Verify your email before signing in. Check your inbox for the link.",
  registrationFailed: "Registration failed",
} as const;

/** One wording for a bad reset link, on the page and after a failed submit. */
export const RESET_TOKEN_ERRORS = {
  expired: "This reset link has expired.",
  invalid: "This reset link is invalid or was already used.",
} as const;

/** "Try again in X minutes": `minutes` is already rounded up, at least 1. */
export const tooManyAttempts = (minutes: number): string =>
  `Too many attempts. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;

/** Auth.js error codes that reach `/sign-in?error=`, and what they show. */
export const SIGN_IN_ERRORS: Record<string, string> = {
  OAuthAccountNotLinked:
    "An account with this email already exists. Sign in the way you did before.",
  AccessDenied: "Access was denied.",
  Configuration: "Sign-in is misconfigured. Please try again later.",
};

/** For any `?error=` code without its own message. */
export const SIGN_IN_ERROR_DEFAULT = "Sign-in failed. Please try again.";

/** `/api/auth/verify-email` outcomes, shown on `/sign-in?verify=`. */
export const VERIFY_NOTICES: Record<string, VerifyNotice> = {
  success: { text: "Email verified. You can sign in now.", ok: true },
  expired: { text: "That verification link expired. Sign in to get a new one.", ok: false },
  invalid: {
    text: "That verification link is invalid or was already used. Try signing in.",
    ok: false,
  },
};

/** Toasts on `/sign-in` for the one-shot flags in `FLAGS`. */
export const SIGN_IN_TOASTS = {
  // Also shown when the email was already taken: register never says so. With
  // verification on, the inbox holds a verification link or a note that the
  // account exists, and "Check your email" is true of both.
  registeredCheckEmail: {
    id: "registered",
    title: "Check your email",
    description: "We sent you a link to finish signing up.",
  },
  registeredNoVerification: {
    id: "registered",
    title: "Account created",
    description: "You can sign in now.",
  },
  passwordReset: {
    id: "password-reset",
    title: "Password updated",
    description: "Sign in with your new password.",
  },
  accountDeleted: {
    id: "account-deleted",
    title: "Account deleted",
    description: "Your account and everything in it are gone.",
  },
} as const;
