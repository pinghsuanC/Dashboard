/** System item types that need a Pro subscription. */
export const PRO_TYPE_NAMES: ReadonlySet<string> = new Set(["file", "image"]);

/** Body fields an item type can edit, beyond the title, description and tags every type has. */
export type EditableItemField = "content" | "language" | "url";

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
