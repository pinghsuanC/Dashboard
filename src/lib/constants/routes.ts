import { FILE_DOWNLOAD_PARAM } from "@/lib/constants/files";

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
  collections: "/collections",
  // Linked from the app already, not built yet (see routes.test.ts).
  settings: "/settings",
  items: "/items",
} as const;

/** Route handlers: linked from emails, or fetched by the app's own client code. */
export const API_ROUTES = {
  /** Every route handler sits under it; the proxy answers these with 401 when signed out. */
  root: "/api",
  verifyEmail: "/api/auth/verify-email",
  signedOut: "/api/auth/signed-out",
  items: "/api/items",
} as const;

/** `/api/items/<id>`, the item drawer's fetch. Encoded: the id comes from data. */
export const itemApiHref = (id: string): string => `${API_ROUTES.items}/${encodeURIComponent(id)}`;

/**
 * `/api/items/<id>/file`, an item's stored file: shown inline for an image,
 * or with `download` set, always served as a download.
 */
export const itemFileHref = (id: string, { download = false } = {}): string =>
  `${itemApiHref(id)}/file${download ? `?${new URLSearchParams({ [FILE_DOWNLOAD_PARAM.param]: FILE_DOWNLOAD_PARAM.value })}` : ""}`;

/** Where sign-in lands when no safe `callbackUrl` was given. */
export const DEFAULT_SIGN_IN_REDIRECT = ROUTES.dashboard;

/**
 * `/collections/react-patterns`. One place, so cards and the sidebar agree.
 * A stored slug needs no encoding; it is encoded anyway, like `itemApiHref`,
 * so a malformed one can't add path segments or a query.
 */
export const collectionHref = (slug: string): string => `${ROUTES.collections}/${encodeURIComponent(slug)}`;

/**
 * `/items/snippets`: routes are plural, the stored type `name` is not. Every
 * system type pluralizes with a plain "s"; custom types may need more.
 */
export const itemTypeHref = (typeName: string): string => `${ROUTES.items}/${typeName}s`;

/**
 * The type name an `/items/[type]` segment was built from by `itemTypeHref()`:
 * "snippets" -> "snippet". Null when the segment can't be one of its outputs.
 */
export const itemTypeNameFromSegment = (segment: string): string | null =>
  segment.length > 1 && segment.endsWith("s") ? segment.slice(0, -1) : null;

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

/**
 * The only flags the signed-out route carries on to sign-in. A fixed list,
 * so its query can't be used to send the browser anywhere else.
 */
export const SIGNED_OUT_FORWARDED_FLAGS: readonly Flag[] = [FLAGS.deleted];

/** A flag as search params, e.g. for `signInHref(url, flagParams(FLAGS.reset))`. */
export const flagParams = (flag: Flag): Record<string, string> => ({ [flag.param]: flag.value });

/** `path` with one flag set: `/profile?password=changed`. */
export const withFlag = (path: string, flag: Flag): string =>
  `${path}?${new URLSearchParams(flagParams(flag))}`;
