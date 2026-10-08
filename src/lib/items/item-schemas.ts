import { z } from "zod";

import { isFileItemType } from "@/lib/constants/files";
import { editableFieldsFor } from "@/lib/constants/item-types";
import {
  ITEM_CONTENT_MAX_LENGTH,
  ITEM_DESCRIPTION_MAX_LENGTH,
  ITEM_TITLE_MAX_LENGTH,
} from "@/lib/constants/limits";
import {
  FILE_REQUIRED,
  ITEM_CONTENT_TOO_LONG,
  ITEM_DESCRIPTION_TOO_LONG,
  ITEM_TAG_INVALID,
  ITEM_TITLE_REQUIRED,
  ITEM_TITLE_TOO_LONG,
  ITEM_URL_INVALID,
  ITEM_URL_REQUIRED,
} from "@/lib/constants/messages/items";
import { slugify } from "@/lib/helpers/slugify";
import { checkFile } from "@/lib/items/file-rules";
import type { FileItemKind } from "@/types/files";
import type { ItemCreateInput, ItemUpdate } from "@/types/items";

const title = z
  .string({ error: ITEM_TITLE_REQUIRED })
  .trim()
  .min(1, ITEM_TITLE_REQUIRED)
  .max(ITEM_TITLE_MAX_LENGTH, ITEM_TITLE_TOO_LONG);

// Blank clears the field (null); left out, it isn't written (undefined).
const optionalText = (maxLength = Infinity, tooLong?: string) =>
  z
    .string()
    .trim()
    .max(maxLength, tooLong)
    .transform((value) => value || null)
    .nullable()
    .optional();

// Web links only: the drawer makes a link's URL clickable, so no `javascript:`.
const requiredUrl = z
  .string({ error: ITEM_URL_REQUIRED })
  .trim()
  .min(1, ITEM_URL_REQUIRED)
  .pipe(z.url({ protocol: /^https?$/, error: ITEM_URL_INVALID }));

// Trimmed, blanks dropped, and one per slug (first spelling wins), since the
// database keeps one tag per slug anyway.
const tags = z
  .array(z.string())
  .transform((names, ctx) => {
    const bySlug = new Map<string, string>();
    for (const name of names.map((raw) => raw.trim()).filter(Boolean)) {
      const slug = slugify(name);
      if (!slug) {
        ctx.addIssue({ code: "custom", message: ITEM_TAG_INVALID });
        return z.NEVER;
      }
      if (!bySlug.has(slug)) bySlug.set(slug, name);
    }
    return [...bySlug.values()];
  })
  .optional();

// Accepts anything and keeps nothing: a field this type doesn't edit.
const ignored = z.unknown().transform(() => undefined).optional();

// An item form's fields for one type, before any type-specific additions.
const itemFieldsFor = (typeName: string) => {
  const fields = editableFieldsFor(typeName);
  return z.object({
    title,
    description: optionalText(ITEM_DESCRIPTION_MAX_LENGTH, ITEM_DESCRIPTION_TOO_LONG),
    tags,
    content: fields.includes("content")
      ? optionalText(ITEM_CONTENT_MAX_LENGTH, ITEM_CONTENT_TOO_LONG)
      : ignored,
    language: fields.includes("language") ? optionalText() : ignored,
    url: fields.includes("url") ? requiredUrl : ignored,
  });
};

/**
 * The item edit payload for one item type. Title, description and tags are
 * common; content, language and url are validated only where the type edits
 * them (`editableFieldsFor`) and dropped otherwise, so a hand-built request
 * can't write a field its type doesn't show. A type that edits its URL must
 * keep one.
 */
export const itemUpdateSchemaFor = (typeName: string): z.ZodType<ItemUpdate> => itemFieldsFor(typeName);

// The picked file as the browser describes it, checked against the kind's
// upload rules and turned into the file as stored. Left out, the item can't
// be created.
const pickedFile = (kind: FileItemKind) =>
  z
    .object({ name: z.string(), size: z.number(), mimeType: z.string() }, { error: FILE_REQUIRED })
    .transform((file, ctx) => {
      const checked = checkFile(kind, file);
      if (!checked.ok) {
        ctx.addIssue({ code: "custom", message: checked.error });
        return z.NEVER;
      }
      return checked.file;
    });

/**
 * The New Item payload for one item type. The same fields and per-type rules
 * as an edit, so a link needs its URL and other types' fields are dropped.
 * File and image items also need their picked file, which must pass the
 * upload rules; any other type drops a file sent with it. Keys and stored
 * file details are never read from the input: unknown keys are stripped.
 */
export const itemCreateSchemaFor = (typeName: string): z.ZodType<ItemCreateInput> =>
  isFileItemType(typeName)
    ? itemFieldsFor(typeName).extend({ file: pickedFile(typeName) })
    : itemFieldsFor(typeName);
