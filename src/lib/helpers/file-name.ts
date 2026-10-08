import { FALLBACK_FILE_BASE_NAME, FILE_NAME_MAX_LENGTH } from "@/lib/constants/files";

// The last path part: browsers send a bare name, but a hand-built request
// could send "../../x" or a Windows path.
const baseName = (name: string): string => name.split(/[/\\]/).pop() ?? "";

/** The last extension, lower-case with its dot: "Photo.PNG" -> ".png"; "" when there is none. */
export const fileExtension = (name: string): string => {
  const base = baseName(name);
  const dot = base.lastIndexOf(".");
  // A leading dot is a hidden name (".env"), and a trailing one has no extension.
  if (dot <= 0 || dot === base.length - 1) return "";
  return base.slice(dot).toLowerCase();
};

/**
 * A picked file's name, safe to store, show and send in a download header.
 * Folder parts, control characters and anything other than letters, digits,
 * space, `.`, `-` and `_` are dropped (letters of any script stay); runs of
 * spaces, dots and dashes collapse; leading and trailing dots and spaces go;
 * the base is capped at `FILE_NAME_MAX_LENGTH` with the extension kept.
 * Nothing left becomes "file" plus the extension.
 */
export const sanitizeFileName = (name: string): string => {
  const base = baseName(name.normalize("NFC"));
  const ext = fileExtension(base);
  // The extension is already plain: it passed the upload rules' list.
  const cleanExt = ext.replace(/[^\p{L}\p{N}.]/gu, "");
  const trim = (text: string) => text.replace(/^[\s.]+|[\s.]+$/g, "");

  const cleaned = trim(
    base
      .slice(0, base.length - ext.length)
      .replace(/[^\p{L}\p{M}\p{N} ._-]/gu, "")
      .replace(/\s+/g, " ")
      .replace(/\.{2,}/g, ".")
      .replace(/-{2,}/g, "-"),
  );
  // By code point, so a character outside the BMP is never cut in half.
  const capped = trim(Array.from(cleaned).slice(0, FILE_NAME_MAX_LENGTH).join(""));

  return `${capped || FALLBACK_FILE_BASE_NAME}${cleanExt}`;
};

/**
 * A `Content-Disposition` value: a plain-ASCII `filename` for old clients and
 * the exact UTF-8 name in `filename*` (RFC 6266 / 5987).
 */
export const contentDisposition = (type: "inline" | "attachment", fileName: string): string => {
  const ascii = fileName.replace(/[^\x20-\x7e]|["\\]/g, "_");
  // encodeURIComponent leaves ' ( ) * ! unescaped; RFC 5987 wants ' ( ) * encoded.
  const encoded = encodeURIComponent(fileName).replace(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
};
