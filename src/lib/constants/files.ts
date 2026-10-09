import { MINUTE_MS, SECOND_MS } from "@/lib/constants/time";
import type { FileItemKind } from "@/types/files";

/** Bytes in a megabyte, as file size limits and their messages count them. */
export const BYTES_PER_MB = 1024 * 1024;

/** Item types whose body is an uploaded file rather than text. Keyed by name. */
export const FILE_ITEM_TYPE_NAMES: ReadonlySet<string> = new Set<FileItemKind>(["file", "image"]);

export const isFileItemType = (name: string): name is FileItemKind => FILE_ITEM_TYPE_NAMES.has(name);

/**
 * Item types whose stored file the browser may keep and revalidate by ETag.
 * Images are viewed over and over (gallery, drawer); other files are
 * downloaded once and stay out of the browser cache.
 */
export const REVALIDATED_FILE_ITEM_TYPE_NAMES: ReadonlySet<string> = new Set<FileItemKind>(["image"]);

export const isRevalidatedFileItemType = (name: string): boolean => REVALIDATED_FILE_ITEM_TYPE_NAMES.has(name);

/**
 * What each file item type accepts. `types` maps each allowed extension to
 * the MIME types a browser may report for it; the first is the one the file
 * is stored and served as. Both kinds are capped at 5 MB for now, kept apart
 * so they can differ later.
 */
export const UPLOAD_RULES: Readonly<
  Record<FileItemKind, { maxBytes: number; types: Readonly<Record<string, readonly string[]>> }>
> = {
  image: {
    maxBytes: 5 * BYTES_PER_MB,
    types: {
      ".png": ["image/png"],
      ".jpg": ["image/jpeg"],
      ".jpeg": ["image/jpeg"],
      ".gif": ["image/gif"],
      ".webp": ["image/webp"],
      ".svg": ["image/svg+xml"],
    },
  },
  file: {
    maxBytes: 5 * BYTES_PER_MB,
    types: {
      ".pdf": ["application/pdf"],
      ".txt": ["text/plain"],
      ".md": ["text/markdown"],
      ".json": ["application/json"],
      ".yaml": ["application/x-yaml", "text/yaml"],
      ".yml": ["application/x-yaml", "text/yaml"],
      ".xml": ["application/xml", "text/xml"],
      ".csv": ["text/csv"],
      ".toml": ["application/toml"],
      ".ini": ["text/plain"],
    },
  },
};

/** How long a signed upload link works. The browser starts its upload at once. */
export const UPLOAD_URL_TTL_MS = 5 * MINUTE_MS;
/** The same, in the seconds the S3 presigner takes. */
export const UPLOAD_URL_TTL_SECONDS = UPLOAD_URL_TTL_MS / SECOND_MS;

/**
 * How long the browser's upload may take before it is given up: the create
 * dialog can't be closed mid-upload, so a stalled one must end on its own.
 */
export const UPLOAD_TIMEOUT_MS = 1 * MINUTE_MS;

/** A stored file name's length before its extension, in characters. */
export const FILE_NAME_MAX_LENGTH = 100;

/** The stored name when cleaning leaves nothing of the original. */
export const FALLBACK_FILE_BASE_NAME = "file";

/** Served for a stored file with no recorded type: browsers treat it as a plain download. */
export const FALLBACK_CONTENT_TYPE = "application/octet-stream";

/** First part of every object key; the user's id and the file's uuid follow. */
export const FILE_KEY_ROOT = "users";

/** Query flag on the file route that serves the file as a download. */
export const FILE_DOWNLOAD_PARAM = { param: "download", value: "1" } as const;

/**
 * `Cache-Control` for stored files. Always `private`, so no shared cache
 * (Vercel edge, a proxy) keeps one user's file for another. A revalidated
 * file may be kept by the browser but is rechecked on every use, so the
 * session and ownership checks still run; any other file is never kept.
 */
export const FILE_CACHE_CONTROL = {
  revalidated: "private, no-cache",
  notStored: "private, no-store",
} as const;

/**
 * Sent with every stored file the app serves. `sandbox` puts the file in a
 * unique origin with scripts off, so an SVG opened directly can't act on the
 * app. Inline styles and data images stay allowed so SVGs still render.
 * `nosniff` stops a browser from guessing a more dangerous type.
 */
export const FILE_RESPONSE_SECURITY_HEADERS = {
  "Content-Security-Policy": "sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:",
  "X-Content-Type-Options": "nosniff",
} as const;
