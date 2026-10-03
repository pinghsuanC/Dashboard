/**
 * Every page path the app links or redirects to. `src/proxy.ts` can't import
 * these: Next reads its `matcher` statically, so keep the two in step by hand.
 */
export const ROUTES = {
  home: "/",
  signIn: "/sign-in",
  register: "/register",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  dashboard: "/dashboard",
  profile: "/profile",
  // Linked from the app already, not built yet (see routes.test.ts).
  settings: "/settings",
  collections: "/collections",
  items: "/items",
} as const;

/** Route handlers whose URLs leave the app, e.g. in emails. */
export const API_ROUTES = {
  verifyEmail: "/api/auth/verify-email",
} as const;

/** Where sign-in lands when no safe `callbackUrl` was given. */
export const DEFAULT_SIGN_IN_REDIRECT = ROUTES.dashboard;

/** `/collections/react-patterns`. One place, so cards and the sidebar agree. */
export const collectionHref = (slug: string): string => `${ROUTES.collections}/${slug}`;

/**
 * `/items/snippets`: routes are plural, the stored type `name` is not. Every
 * system type pluralizes with a plain "s"; custom types may need more.
 */
export const itemTypeHref = (typeName: string): string => `${ROUTES.items}/${typeName}s`;

/**
 * One-shot query flags: an action redirects with one and the page it lands on
 * shows a toast or notice, then drops it from the URL.
 */
export const FLAGS = {
  /** `/sign-in?registered=1` after register. */
  registered: { param: "registered", value: "1" },
  /** `/sign-in?reset=1` after a password reset. */
  reset: { param: "reset", value: "1" },
  /** `/sign-in?deleted=1` after account deletion. */
  deleted: { param: "deleted", value: "1" },
  /** `/forgot-password?sent=1` after a reset request, whether or not the email exists. */
  sent: { param: "sent", value: "1" },
  /** `/profile?password=changed` after a password change. */
  passwordChanged: { param: "password", value: "changed" },
} as const;

export type Flag = (typeof FLAGS)[keyof typeof FLAGS];

/** A flag as search params, e.g. for `signInHref(url, flagParams(FLAGS.reset))`. */
export const flagParams = (flag: Flag): Record<string, string> => ({ [flag.param]: flag.value });

/** `path` with one flag set: `/profile?password=changed`. */
export const withFlag = (path: string, flag: Flag): string =>
  `${path}?${new URLSearchParams(flagParams(flag))}`;
