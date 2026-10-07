"use server";

import { unstable_rethrow } from "next/navigation";

import { SOMETHING_WENT_WRONG } from "@/lib/constants/messages/common";
import { ITEM_NOT_FOUND, ITEM_SAVE_INVALID } from "@/lib/constants/messages/items";
import { type ItemDetail, getItemTypeName, updateItem as saveItem } from "@/lib/db/items";
import { fieldErrorsOf } from "@/lib/form-errors";
import { itemUpdateSchemaFor } from "@/lib/item-schemas";
import { resetProfile } from "@/lib/user-session";
import type { ActionResult } from "@/types/forms";

const NOT_FOUND = { success: false, error: { message: ITEM_NOT_FOUND, code: "not-found" } } as const;

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
