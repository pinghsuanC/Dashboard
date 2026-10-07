import {
  ITEM_CONTENT_MAX_LENGTH,
  ITEM_DESCRIPTION_MAX_LENGTH,
  ITEM_TITLE_MAX_LENGTH,
} from "@/lib/constants/limits";

/** Item drawer toasts and inline errors. */
export const ITEM_COPIED = "Copied to clipboard";
export const ITEM_COPY_FAILED = "Couldn't copy. Please try again.";
export const ITEM_LOAD_FAILED = "Couldn't load this item. Please try again.";

/** Item edit: validation (item-schemas.ts). */
export const ITEM_TITLE_REQUIRED = "Title is required";
export const ITEM_TITLE_TOO_LONG = `Title must be at most ${ITEM_TITLE_MAX_LENGTH} characters`;
export const ITEM_DESCRIPTION_TOO_LONG = `Description must be at most ${ITEM_DESCRIPTION_MAX_LENGTH} characters`;
export const ITEM_CONTENT_TOO_LONG = `Content must be at most ${ITEM_CONTENT_MAX_LENGTH.toLocaleString("en-US")} characters`;
export const ITEM_URL_REQUIRED = "URL is required";
export const ITEM_URL_INVALID = "Enter a valid http or https URL";
export const ITEM_TAG_INVALID = "Each tag needs at least one letter or number";

/** Item edit: save outcome. */
export const ITEM_SAVED = "Item saved";
export const ITEM_SAVE_INVALID = "Check the highlighted fields";
export const ITEM_NOT_FOUND = "This item no longer exists";

/** Item delete: outcome. Not found reuses `ITEM_NOT_FOUND`. */
export const ITEM_DELETED = "Item deleted";

/** Item create: outcome. Invalid fields reuse `ITEM_SAVE_INVALID`. */
export const ITEM_CREATED = "Item created";
export const ITEM_TYPE_INVALID = "Choose one of the listed item types";
