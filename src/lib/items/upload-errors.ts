// Why a file or image item's file step failed. Thrown by the storage service
// and `uploadItemFile`, and turned into a message by `createItem`; none of
// them carries user-facing wording.

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

/** The caller is over the upload limit; `reset` is when it lifts, in ms since the epoch. */
export class UploadRateLimitedError extends Error {
  constructor(public readonly reset: number) {
    super("Over the upload rate limit");
    this.name = "UploadRateLimitedError";
  }
}

/** A file or image item reached its file step without a checked file. */
export class FileMissingError extends Error {
  constructor() {
    super("A file or image item has no file to upload");
    this.name = "FileMissingError";
  }
}
