import { z } from "zod";

import { COLLECTION_DESCRIPTION_MAX_LENGTH, COLLECTION_NAME_MAX_LENGTH } from "@/lib/constants/limits";
import {
  COLLECTION_DESCRIPTION_TOO_LONG,
  COLLECTION_NAME_INVALID,
  COLLECTION_NAME_REQUIRED,
  COLLECTION_NAME_TOO_LONG,
} from "@/lib/constants/messages/collections";
import { slugify } from "@/lib/helpers/slugify";
import type { CollectionCreate } from "@/types/collections";

// The slug is the collection's key (`[userId, slug]`), so a name that slugs
// to nothing can't be stored.
const name = z
  .string({ error: COLLECTION_NAME_REQUIRED })
  .trim()
  .min(1, COLLECTION_NAME_REQUIRED)
  .max(COLLECTION_NAME_MAX_LENGTH, COLLECTION_NAME_TOO_LONG)
  .refine((value) => slugify(value) !== "", COLLECTION_NAME_INVALID);

// Blank or left out, there is no description.
const description = z
  .string()
  .trim()
  .max(COLLECTION_DESCRIPTION_MAX_LENGTH, COLLECTION_DESCRIPTION_TOO_LONG)
  .optional()
  .transform((value) => value || null);

/**
 * The New Collection payload. Unknown keys are stripped, so the owner, id and
 * slug are never read from the input: the slug comes from the name when stored.
 */
export const collectionCreateSchema: z.ZodType<CollectionCreate> = z.object({
  name,
  description,
  isFavorite: z.boolean().default(false),
});
