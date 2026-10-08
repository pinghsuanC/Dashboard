import type { EditableItemField } from "@/types/items";
/** System item types that need a Pro subscription. */
export const PRO_TYPE_NAMES: ReadonlySet<string> = new Set(["file", "image"]);

/**
 * Which body fields each system type edits, keyed by type name (never id:
 * ids are random per database). Types not listed, such as file, image and a
 * Pro user's own types, edit only the common fields. Read it through
 * `editableFieldsFor()`, so moving this into the database later changes one place.
 */
export const EDITABLE_FIELDS_BY_TYPE: Readonly<Record<string, readonly EditableItemField[]>> = {
  snippet: ["content", "language"],
  command: ["content", "language"],
  prompt: ["content"],
  note: ["content"],
  link: ["url"],
};

// `Object.hasOwn`: a plain lookup would find "constructor" on the prototype.
export const editableFieldsFor = (typeName: string): readonly EditableItemField[] =>
  Object.hasOwn(EDITABLE_FIELDS_BY_TYPE, typeName) ? EDITABLE_FIELDS_BY_TYPE[typeName] : [];

/**
 * The types the New Item dialog offers, in its order. File and image upload
 * their file after the item is saved. Custom types don't exist yet.
 */
export const CREATABLE_ITEM_TYPE_NAMES: readonly string[] = [
  "snippet",
  "prompt",
  "command",
  "note",
  "link",
  "file",
  "image",
];

export const isCreatableItemType = (name: string): boolean => CREATABLE_ITEM_TYPE_NAMES.includes(name);

/**
 * Types whose content is code: shown and edited in the Monaco code editor
 * rather than a plain text box. Keyed by name, like the maps above.
 */
export const CODE_ITEM_TYPE_NAMES: ReadonlySet<string> = new Set(["snippet", "command"]);

export const isCodeItemType = (name: string): boolean => CODE_ITEM_TYPE_NAMES.has(name);

/**
 * Types whose content is Markdown: written in the Markdown editor's Write tab
 * and shown rendered. Keyed by name, like the maps above.
 */
export const MARKDOWN_ITEM_TYPE_NAMES: ReadonlySet<string> = new Set(["note", "prompt"]);

export const isMarkdownItemType = (name: string): boolean => MARKDOWN_ITEM_TYPE_NAMES.has(name);
