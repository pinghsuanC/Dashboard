import { COLLECTION_DESCRIPTION_MAX_LENGTH, COLLECTION_NAME_MAX_LENGTH } from "@/lib/constants/limits";

/** Collection create: validation (collection-schemas.ts). */
export const COLLECTION_NAME_REQUIRED = "Name is required";
export const COLLECTION_NAME_TOO_LONG = `Name must be at most ${COLLECTION_NAME_MAX_LENGTH} characters`;
export const COLLECTION_NAME_INVALID = "Name needs at least one letter or number";
export const COLLECTION_DESCRIPTION_TOO_LONG = `Description must be at most ${COLLECTION_DESCRIPTION_MAX_LENGTH} characters`;

/** Collection create: outcome. Invalid fields use `FIELDS_INVALID` (common.ts). */
export const COLLECTION_CREATED = "Collection created";
/** Names are matched by slug, so "React Patterns" and "react-patterns" clash. */
export const COLLECTION_NAME_TAKEN = "You already have a collection with this name";
