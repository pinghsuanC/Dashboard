// Why a file or image item's file step failed. Thrown by the storage service
// and `uploadItemFile`, and turned into a message by `createItem`; none of
// them carries user-facing wording. Over the upload limit is not one of them:
// `createItem` checks that before saving anything.

/**
 * Thrown by the storage service when an `R2_*` setting is missing, before any
 * client is built. Callers answer it with `FILE_UPLOAD_UNAVAILABLE`; the
 * missing names are only logged.
 */
export class StorageNotConfiguredError extends Error {
  constructor(public readonly missing: readonly string[]) {
    super(`File storage is not configured: ${missing.join(", ")} missing`);
    this.name = "StorageNotConfiguredError";
  }
}

/** A file or image item reached its file step without a checked file. */
export class FileMissingError extends Error {
  constructor() {
    super("A file or image item has no file to upload");
    this.name = "FileMissingError";
  }
}
