import { DEFAULT_SIGN_IN_REDIRECT, type Flag, ROUTES } from "@/lib/constants/routes";
import { PROBE_ORIGIN } from "@/lib/constants/security";

/**
 * Keeps post-sign-in redirects on this site. Only same-origin paths pass.
 * Comparing prefixes isn't enough, because browsers clean a URL up before
 * following it: they read `\` as `/` and drop tabs and newlines, so
 * `/\evil.com` and `/<tab>/evil.com` both become the protocol-relative
 * `//evil.com`. So the value is resolved with the WHATWG URL parser, which
 * browsers implement and which does the same cleanup, and must stay on our
 * origin. Auth.js's redirect callback checks the origin too, but
 * `redirectIfSignedIn` hands the value straight to Next's `redirect()`.
 */
export const safeCallbackUrl = (value: unknown): string => {
  if (typeof value !== "string" || !value.startsWith("/")) return DEFAULT_SIGN_IN_REDIRECT;
  try {
    const url = new URL(value, PROBE_ORIGIN);
    if (url.origin !== PROBE_ORIGIN) return DEFAULT_SIGN_IN_REDIRECT;
    // The parsed form, not the input: the redirect goes where the check looked.
    return url.pathname + url.search + url.hash;
  } catch {
    // Unparseable, e.g. `//` (an empty host).
    return DEFAULT_SIGN_IN_REDIRECT;
  }
};

/** A search param's first value: Next gives an array when a key repeats. */
export const firstParam = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

/** Whether a page's search params carry a one-shot flag from `FLAGS`. */
export const hasFlag = (
  params: Record<string, string | string[] | undefined>,
  flag: Flag,
): boolean => firstParam(params[flag.param]) === flag.value;

/** `/sign-in?callbackUrl=…`, for redirects that send a user to sign in. */
export const signInHref = (
  callbackUrl: string = DEFAULT_SIGN_IN_REDIRECT,
  extra: Record<string, string> = {},
): string => `${ROUTES.signIn}?${new URLSearchParams({ callbackUrl, ...extra })}`;
