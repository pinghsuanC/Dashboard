export const DEFAULT_SIGN_IN_REDIRECT = "/dashboard";

/**
 * Keeps post-sign-in redirects on this site. Only same-origin paths pass;
 * `//evil.com` and `/\evil.com` are protocol-relative to browsers, so they are
 * rejected too. Auth.js's own redirect callback also checks the origin — this
 * just fails closed before the value reaches it.
 */
export const safeCallbackUrl = (value: unknown): string => {
  if (typeof value !== "string" || !value.startsWith("/")) return DEFAULT_SIGN_IN_REDIRECT;
  if (value.startsWith("//") || value.startsWith("/\\")) return DEFAULT_SIGN_IN_REDIRECT;
  return value;
};

/** A search param's first value: Next gives an array when a key repeats. */
export const firstParam = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

/** `/sign-in?callbackUrl=…`, for redirects that send a user to sign in. */
export const signInHref = (
  callbackUrl: string = DEFAULT_SIGN_IN_REDIRECT,
  extra: Record<string, string> = {},
): string => `/sign-in?${new URLSearchParams({ callbackUrl, ...extra })}`;
