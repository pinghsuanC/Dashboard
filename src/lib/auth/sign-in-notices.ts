import {
  SIGN_IN_ERROR_DEFAULT,
  SIGN_IN_ERRORS,
  VERIFY_NOTICES,
} from "@/lib/constants/messages/auth";
import type { VerifyNotice } from "@/types/auth";

// Auth.js sends its error codes to the sign-in page via `pages.error`, and
// `/api/auth/verify-email` lands there with `?verify=`. Both codes come
// straight from the URL. Own keys only: a plain-object lookup hands back
// `Object.prototype` members for codes like `toString`, and React can't
// render a function, so `/sign-in?error=toString` crashed the page.

/** The message for an Auth.js `?error=` code; unknown codes get a generic one. */
export const signInErrorMessage = (code: string | undefined): string | null => {
  if (!code) return null;
  return Object.hasOwn(SIGN_IN_ERRORS, code) ? SIGN_IN_ERRORS[code] : SIGN_IN_ERROR_DEFAULT;
};

/** The notice for `?verify=`, or null when there is none or it's unknown. */
export const verifyNotice = (code: string | undefined): VerifyNotice | null =>
  code && Object.hasOwn(VERIFY_NOTICES, code) ? VERIFY_NOTICES[code] : null;
