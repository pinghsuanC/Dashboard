import { UPLOAD_RULES } from "@/lib/constants/files";
import { fileTooLarge, fileTypeNotAllowed } from "@/lib/constants/messages/items";
import { fileExtension, sanitizeFileName } from "@/lib/helpers/file-name";
import type { CheckedFile, FileItemKind, FileMeta } from "@/types/files";

/**
 * Checks a picked file against its item type's upload rules: an allowed
 * extension, a reported MIME type that fits it (blank is fine: browsers don't
 * know every type), and a size up to the kind's limit (an empty file is fine). The same check
 * runs in the browser before anything is sent and on the server before the
 * item is saved. Passing, it returns the file as stored: cleaned name, and the
 * extension's own MIME type rather than the browser's.
 */
export const checkFile = (
  kind: FileItemKind,
  file: FileMeta,
): { ok: true; file: CheckedFile } | { ok: false; error: string } => {
  const { maxBytes, types } = UPLOAD_RULES[kind];
  const ext = fileExtension(file.name);
  const mimes = Object.hasOwn(types, ext) ? types[ext] : undefined;
  const reported = file.mimeType.trim().toLowerCase();

  if (!mimes || (reported !== "" && !mimes.includes(reported))) {
    return { ok: false, error: fileTypeNotAllowed(Object.keys(types)) };
  }
  if (!Number.isSafeInteger(file.size) || file.size < 0) {
    return { ok: false, error: fileTooLarge(maxBytes) };
  }
  if (file.size > maxBytes) return { ok: false, error: fileTooLarge(maxBytes) };

  return {
    ok: true,
    file: { name: sanitizeFileName(file.name), size: file.size, ext, contentType: mimes[0] },
  };
};
