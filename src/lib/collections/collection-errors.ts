/**
 * An item create or edit named a collection the user doesn't have: missing,
 * or another user's. Thrown inside the write's transaction before anything is
 * written; the item actions answer it as a `collectionIds` field error.
 */
export class CollectionNotFoundError extends Error {
  constructor() {
    super("A chosen collection is missing or not the user's");
    this.name = "CollectionNotFoundError";
  }
}
