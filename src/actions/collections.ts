"use server";

import { unstable_rethrow } from "next/navigation";

import { collectionCreateSchema } from "@/lib/collections/collection-schemas";
import { COLLECTION_NAME_TAKEN } from "@/lib/constants/messages/collections";
import { FIELDS_INVALID, SOMETHING_WENT_WRONG } from "@/lib/constants/messages/common";
import { createCollection as saveNewCollection } from "@/lib/db/collections";
import { fieldErrorsOf } from "@/lib/helpers/form-errors";
import { resetProfile } from "@/lib/session/user-session";
import { requireCurrentUserId } from "@/services/auth/session";
import type { SessionCollection } from "@/types/collections";
import type { ActionResult } from "@/types/forms";

const NAME_TAKEN = {
  success: false,
  error: { message: FIELDS_INVALID, fieldErrors: { name: COLLECTION_NAME_TAKEN } },
} as const;

/**
 * Saves the New Collection dialog. Called directly, like `createItem`: the
 * input is typed, and success returns the new collection.
 *
 * A name whose slug the user already has answers as a name field error. Only
 * success refreshes the page and session, so the sidebar, dashboard cards and
 * stats show the new collection.
 */
export const createCollection = async (input: unknown): Promise<ActionResult<SessionCollection>> => {
  // First and outside the try: a signed-out caller is redirected to sign in
  // whatever they send, never answered with validation messages.
  await requireCurrentUserId();

  const parsed = collectionCreateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: { message: FIELDS_INVALID, fieldErrors: fieldErrorsOf(parsed.error) },
    };
  }

  try {
    const collection = await saveNewCollection(parsed.data);
    if (!collection) return NAME_TAKEN;
    resetProfile();
    return { success: true, data: collection };
  } catch (error) {
    // The sign-in redirect for a signed-out user must propagate.
    unstable_rethrow(error);
    console.error("Collection create failed:", error);
    return { success: false, error: { message: SOMETHING_WENT_WRONG } };
  }
};
