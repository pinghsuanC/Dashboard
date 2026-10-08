"use client";

import { type DragEvent, useEffect, useId, useRef, useState } from "react";
import { FileText, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { UPLOAD_RULES } from "@/lib/constants/files";
import { FILE_UPLOADING } from "@/lib/constants/messages/items";
import { FILE_PICK_TOAST_ID } from "@/lib/constants/ui";
import { formatBytes } from "@/lib/helpers/format";
import { checkFile } from "@/lib/items/file-rules";
import { cn } from "@/lib/utils";
import type { FileItemKind } from "@/types/files";

interface FileUploadProps {
  kind: FileItemKind;
  file: File | null;
  onChange: (file: File | null) => void;
  /** 0..1 while the file uploads, else null. */
  progress: number | null;
  disabled?: boolean;
  /** The server's message for this field, if the save refused the file. */
  error?: string;
}

/**
 * The upload box for file and image items: drop a file on it or click to
 * pick one. A file the kind doesn't take, or one over its size limit, is
 * refused with a toast and never held. Holds one file: an image shows a
 * preview, any other file its name and size. The upload itself happens after
 * the item is saved; `progress` shows it.
 */
export const FileUpload = ({ kind, file, onChange, progress, disabled, error }: FileUploadProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const [dragging, setDragging] = useState(false);
  const preview = usePreviewUrl(kind === "image" ? file : null);
  const { maxBytes, types } = UPLOAD_RULES[kind];
  const extensions = Object.keys(types);

  const take = (picked: File | undefined) => {
    if (!picked) return;
    const checked = checkFile(kind, { name: picked.name, size: picked.size, mimeType: picked.type });
    if (!checked.ok) {
      toast.error(checked.error, { id: FILE_PICK_TOAST_ID });
      return;
    }
    onChange(picked);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (!disabled) take(event.dataTransfer.files[0]);
  };

  return (
    <div className="grid gap-2">
      <span id={`${id}-label`} className="text-sm font-medium">
        {kind === "image" ? "Image" : "File"}
      </span>

      {file ? (
        <div className="flex items-center gap-3 rounded-lg border p-3">
          {preview ? (
            // A local data URL: next/image has nothing to optimise.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="size-14 shrink-0 rounded object-cover" />
          ) : (
            <div className="bg-muted grid size-14 shrink-0 place-items-center rounded">
              <FileText className="text-muted-foreground size-6" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="text-muted-foreground text-xs">{formatBytes(file.size)}</p>
            {progress !== null && (
              <div className="mt-2 grid gap-1">
                <div
                  role="progressbar"
                  aria-label={FILE_UPLOADING}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(progress * 100)}
                  className="bg-muted h-1.5 overflow-hidden rounded-full"
                >
                  <div className="bg-primary h-full transition-[width]" style={{ width: `${progress * 100}%` }} />
                </div>
                <p className="text-muted-foreground text-xs">
                  {FILE_UPLOADING} {Math.round(progress * 100)}%
                </p>
              </div>
            )}
          </div>
          {progress === null && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled}
              onClick={() => onChange(null)}
              aria-label="Remove file"
            >
              <X />
            </Button>
          )}
        </div>
      ) : (
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-labelledby={`${id}-label`}
          aria-describedby={error ? `${id}-error` : `${id}-hint`}
          aria-disabled={disabled}
          onClick={() => !disabled && inputRef.current?.click()}
          onKeyDown={(event) => {
            if (!disabled && (event.key === "Enter" || event.key === " ")) {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            if (!disabled) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "hover:bg-muted/40 focus-visible:ring-ring/50 flex flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center transition-colors outline-none focus-visible:ring-3",
            dragging && "border-primary bg-primary/5",
            error && "border-destructive",
            disabled && "pointer-events-none opacity-50",
          )}
        >
          <Upload className="text-muted-foreground size-6" />
          <p className="text-sm">
            <span className="font-medium">Drop a file here</span> or click to choose
          </p>
          <p id={`${id}-hint`} className="text-muted-foreground text-xs">
            {extensions.join(", ")} · up to {formatBytes(maxBytes)}
          </p>
        </div>
      )}

      {error && (
        <p id={`${id}-error`} className="text-destructive text-sm">
          {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={extensions.join(",")}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          take(event.target.files?.[0]);
          // Cleared, so picking the same file again still fires a change.
          event.target.value = "";
        }}
      />
    </div>
  );
};

/**
 * The file read as a data URL, for an `<img>` preview; `null` until it is read
 * and for any other file. A data URL needs no revoking, and the read is
 * dropped if the file changes first. Only the current file's preview shows.
 */
const usePreviewUrl = (file: File | null): string | null => {
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null);
  useEffect(() => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPreview({ file, url: String(reader.result) });
    reader.readAsDataURL(file);
    return () => reader.abort();
  }, [file]);
  return preview?.file === file ? preview.url : null;
};
