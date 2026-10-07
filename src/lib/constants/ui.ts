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

/** Toast id for the item drawer's Copy: repeat clicks update one toast. */
export const ITEM_COPY_TOAST_ID = "item-copy-toast";

/** Toast id for the item drawer's Save: a repeat save updates one toast. */
export const ITEM_SAVE_TOAST_ID = "item-save-toast";

/** Toast id for the item drawer's Delete: a repeat delete updates one toast. */
export const ITEM_DELETE_TOAST_ID = "item-delete-toast";

/** Letters in an avatar's initials: "Ada Byron King" -> "AB". */
export const AVATAR_INITIALS_MAX = 2;

/** Toast id for the New Item dialog's Create: a repeat create updates one toast. */
export const ITEM_CREATE_TOAST_ID = "item-create-toast";
