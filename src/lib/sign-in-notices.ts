// Auth.js sends its error codes here via `pages.error`.
const ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked:
    "An account with this email already exists. Sign in the way you did before.",
  AccessDenied: "Access was denied.",
  Configuration: "Sign-in is misconfigured. Please try again later.",
};
const DEFAULT_ERROR = "Sign-in failed. Please try again.";

export interface VerifyNotice {
  text: string;
  ok: boolean;
}

// `/api/auth/verify-email` lands here with `?verify=`.
const VERIFY_MESSAGES: Record<string, VerifyNotice> = {
  success: { text: "Email verified. You can sign in now.", ok: true },
  expired: {
    text: "That verification link expired. Sign in to get a new one.",
    ok: false,
  },
  invalid: {
    text: "That verification link is invalid or was already used. Try signing in.",
    ok: false,
  },
};

// Both codes come straight from the URL. Own keys only: a plain-object lookup
// hands back `Object.prototype` members for codes like `toString`, and React
// can't render a function, so `/sign-in?error=toString` crashed the page.

/** The message for an Auth.js `?error=` code; unknown codes get a generic one. */
export const signInErrorMessage = (code: string | undefined): string | null => {
  if (!code) return null;
  return Object.hasOwn(ERROR_MESSAGES, code) ? ERROR_MESSAGES[code] : DEFAULT_ERROR;
};

/** The notice for `?verify=`, or null when there is none or it's unknown. */
export const verifyNotice = (code: string | undefined): VerifyNotice | null =>
  code && Object.hasOwn(VERIFY_MESSAGES, code) ? VERIFY_MESSAGES[code] : null;
