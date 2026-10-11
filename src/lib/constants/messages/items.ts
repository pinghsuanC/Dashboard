import {
  ITEM_COLLECTION_LIMIT,
  ITEM_CONTENT_MAX_LENGTH,
  ITEM_DESCRIPTION_MAX_LENGTH,
  ITEM_TITLE_MAX_LENGTH,
} from "@/lib/constants/limits";
import { formatBytes } from "@/lib/helpers/format";

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
export const ITEM_COLLECTIONS_TOO_MANY = `Choose at most ${ITEM_COLLECTION_LIMIT} collections`;
/** A chosen collection is missing or not the user's: both read as gone. */
export const ITEM_COLLECTION_NOT_FOUND = "A chosen collection no longer exists. Pick again.";

/** Item edit: save outcome. */
export const ITEM_SAVED = "Item saved";
export const ITEM_NOT_FOUND = "This item no longer exists";

/** Item delete: outcome. Not found reuses `ITEM_NOT_FOUND`. */
export const ITEM_DELETED = "Item deleted";

/** Item create: outcome. Invalid fields use `FIELDS_INVALID` (common.ts). */
export const ITEM_CREATED = "Item created";
export const ITEM_TYPE_INVALID = "Choose one of the listed item types";

/** File and image items: the picked file (file-rules.ts, the upload). */
export const FILE_REQUIRED = "Choose a file to upload";
/** "File must be at most 5 MB". */
export const fileTooLarge = (maxBytes: number): string => `File must be at most ${formatBytes(maxBytes)}`;
/** "Allowed: .png, .jpg, …", from the kind's extensions. */
export const fileTypeNotAllowed = (extensions: readonly string[]): string =>
  `This file type isn't allowed. Allowed: ${extensions.join(", ")}`;
export const FILE_UPLOADING = "Uploading…";
/** Storage isn't configured on this server; the details only go to the log. */
export const FILE_UPLOAD_UNAVAILABLE = "An unknown error occurred with file uploads. Please try again later.";
export const FILE_UPLOAD_FAILED = "The item was saved, but its file didn't upload. Delete it and try again.";
/** The item was saved but its file step failed: "The item was saved without its file. <reason>". */
export const itemSavedWithoutFile = (reason: string): string => `The item was saved without its file. ${reason}`;
