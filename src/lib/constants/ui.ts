/**
 * The app's colour scheme: the class on `<html>` and the Sonner `<Toaster>`
 * theme. One value for both, because without a next-themes provider the
 * Toaster would otherwise fall back to "system" and could disagree with the
 * page. Becomes per-user once `preferredTheme` is wired up.
 */
export const APP_THEME = "dark";

/**
 * Toast id for `ActionForm`'s `{ toast }` results. Fixed, so Strict Mode's
 * double effect, or a repeat submit while one is showing, updates the toast
 * instead of stacking a second one.
 */
export const ACTION_FORM_TOAST_ID = "action-form-toast";

/** Letters in an avatar's initials: "Ada Byron King" -> "AB". */
export const AVATAR_INITIALS_MAX = 2;
