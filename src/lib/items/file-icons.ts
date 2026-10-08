import { File, FileCode, FileSpreadsheet, FileText, FileType, type LucideIcon } from "lucide-react";

import { fileExtension } from "@/lib/helpers/file-name";
import type { FileIconKind } from "@/types/files";

/**
 * The icon kind per extension, lower-case with the dot. Covers every
 * extension `UPLOAD_RULES.file` accepts (a test keeps them in step); anything
 * else, such as a file stored before a rule changed, falls back to "file".
 */
const FILE_ICON_KIND_BY_EXTENSION: Readonly<Record<string, FileIconKind>> = {
  ".pdf": "pdf",
  ".txt": "text",
  ".md": "text",
  ".json": "code",
  ".yaml": "code",
  ".yml": "code",
  ".xml": "code",
  ".toml": "code",
  ".ini": "code",
  ".csv": "spreadsheet",
};

const FILE_ICONS: Readonly<Record<FileIconKind, LucideIcon>> = {
  pdf: FileType,
  text: FileText,
  code: FileCode,
  spreadsheet: FileSpreadsheet,
  file: File,
};

/** The icon kind for a stored file's name; "file" for anything unrecognised. */
export const fileIconKind = (fileName: string | null): FileIconKind => {
  const ext = fileExtension(fileName ?? "");
  // Keys start with a dot, so no extension can name a prototype member.
  return FILE_ICON_KIND_BY_EXTENSION[ext] ?? "file";
};

/** The lucide icon a file row shows for its file name. */
export const getFileIcon = (fileName: string | null): LucideIcon => FILE_ICONS[fileIconKind(fileName)];
