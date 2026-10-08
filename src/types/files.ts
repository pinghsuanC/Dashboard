/** The item types that hold an uploaded file. */
export type FileItemKind = "file" | "image";

/** A picked file as the browser describes it, before the server checks it. */
export interface FileMeta {
  name: string;
  size: number;
  /** What the browser reported; blank when it doesn't know the type. */
  mimeType: string;
}

/** A file that passed the upload rules, in the form it is stored. */
export interface CheckedFile {
  /** Cleaned for display and downloads (`sanitizeFileName`). */
  name: string;
  size: number;
  /** Lower-case, with the dot: ".png". */
  ext: string;
  /** The type it is stored and served as: the extension's first listed MIME type. */
  contentType: string;
}

/** Where the browser sends a new item's file: a signed PUT link and the headers it was signed with. */
export interface UploadTarget {
  url: string;
  headers: Record<string, string>;
}

/** An object read back from storage, ready to stream. */
export interface StoredFile {
  body: ReadableStream<Uint8Array>;
  size: number | null;
}

/** A stored file's key and details, as written onto its item. */
export interface ItemFileFields {
  fileKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

/** What the file route needs of an item: where its file is and how to name it. */
export interface ItemFileRef {
  fileKey: string;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
}

/** Which icon a file row shows, chosen from the file name's extension. */
export type FileIconKind = "pdf" | "text" | "code" | "spreadsheet" | "file";
