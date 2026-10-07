"use server";

import { unstable_rethrow } from "next/navigation";

import { isCreatableItemType } from "@/lib/constants/item-types";
import { SOMETHING_WENT_WRONG } from "@/lib/constants/messages/common";
import { ITEM_NOT_FOUND, ITEM_SAVE_INVALID, ITEM_TYPE_INVALID } from "@/lib/constants/messages/items";
import {
  createItem as saveNewItem,
  deleteItem as removeItem,
  getItemTypeName,
  updateItem as saveItem,
} from "@/lib/db/items";
import { fieldErrorsOf } from "@/lib/helpers/form-errors";
import { itemCreateSchemaFor, itemUpdateSchemaFor } from "@/lib/items/item-schemas";
import { resetProfile } from "@/lib/session/user-session";
import { requireCurrentUserId } from "@/services/auth/session";
import type { ActionResult } from "@/types/forms";
import type { ItemDetail } from "@/types/items";

const NOT_FOUND = { success: false, error: { message: ITEM_NOT_FOUND, code: "not-found" } } as const;
const INVALID_TYPE = { success: false, error: { message: ITEM_TYPE_INVALID } } as const;

/**
 * Saves the item drawer's edit. Called directly by the drawer, not through
 * `ActionForm`: the input is typed, and success returns the saved item.
 *
 * The item's type picks which fields are validated and written. A missing
 * item and another user's answer alike. Both success and not-found refresh
 * the page and session, so card lists and pinned items show the change.
 */
export const updateItem = async (
  itemId: string,
  input: unknown,
): Promise<ActionResult<ItemDetail>> => {
  if (typeof itemId !== "string") return NOT_FOUND;
  try {
    const typeName = await getItemTypeName(itemId);
    if (typeName === null) {
      resetProfile();
      return NOT_FOUND;
    }

    const parsed = itemUpdateSchemaFor(typeName).safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: { message: ITEM_SAVE_INVALID, fieldErrors: fieldErrorsOf(parsed.error) },
      };
    }

    // Still null if the item was deleted since the type lookup.
    const item = await saveItem(itemId, parsed.data);
    resetProfile();
    return item ? { success: true, data: item } : NOT_FOUND;
  } catch (error) {
    // The sign-in redirect for a signed-out user must propagate.
    unstable_rethrow(error);
    console.error("Item update failed:", error);
    return { success: false, error: { message: SOMETHING_WENT_WRONG } };
  }
};

/**
 * Deletes one of the session user's items, after the drawer's confirm. A
 * missing item and another user's answer alike, as in `updateItem`. Both
 * success and not-found refresh the page and session, so counts, pinned
 * items and card lists drop it.
 */
export const deleteItem = async (itemId: string): Promise<ActionResult<null>> => {
  if (typeof itemId !== "string") return NOT_FOUND;
  try {
    const deleted = await removeItem(itemId);
    resetProfile();
    return deleted ? { success: true, data: null } : NOT_FOUND;
  } catch (error) {
    // The sign-in redirect for a signed-out user must propagate.
    unstable_rethrow(error);
    console.error("Item delete failed:", error);
    return { success: false, error: { message: SOMETHING_WENT_WRONG } };
  }
};

/**
 * Saves the New Item dialog. Called directly, like `updateItem`: the input is
 * typed, and success returns the new item.
 *
 * Only the dialog's types are accepted (`isCreatableItemType`); the type
 * picks which fields are validated and written. Success refreshes the page
 * and session, so card lists and counts show the new item.
 */
export const createItem = async (
  typeName: string,
  input: unknown,
): Promise<ActionResult<ItemDetail>> => {
  // First and outside the try: a signed-out caller is redirected to sign in
  // whatever they send, never answered with validation messages.
  await requireCurrentUserId();

  // Also false for a non-string, which a hand-built request could send.
  if (!isCreatableItemType(typeName)) return INVALID_TYPE;

  const parsed = itemCreateSchemaFor(typeName).safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: { message: ITEM_SAVE_INVALID, fieldErrors: fieldErrorsOf(parsed.error) },
    };
  }

  try {
    const item = await saveNewItem(typeName, parsed.data);
    if (!item) return INVALID_TYPE;
    resetProfile();
    return { success: true, data: item };
  } catch (error) {
    // The sign-in redirect for a signed-out user must propagate.
    unstable_rethrow(error);
    console.error("Item create failed:", error);
    return { success: false, error: { message: SOMETHING_WENT_WRONG } };
  }
};
