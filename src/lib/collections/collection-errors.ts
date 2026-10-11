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

/**
 * A collection edit chose a name whose slug another of the user's
 * collections already has (`[userId, slug]` is unique). The edit action
 * answers it as a `name` field error, like a clashing create.
 */
export class CollectionNameTakenError extends Error {
  constructor() {
    super("Another of the user's collections has this slug");
    this.name = "CollectionNameTakenError";
  }
}
