"use client";

import { createElement, type CSSProperties } from "react";
import { Download } from "lucide-react";

import { useItemDrawer } from "@/components/items/ItemDrawerProvider";
import { Button } from "@/components/ui/button";
import { itemFileHref } from "@/lib/constants/routes";
import { FILE_LIST_COLUMNS } from "@/lib/constants/ui";
import { formatBytes, formatLongDate } from "@/lib/helpers/format";
import { getFileIcon } from "@/lib/items/file-icons";
import { cn } from "@/lib/utils";
import type { ItemSummary } from "@/types/items";

interface FileRowProps {
  item: ItemSummary;
}

/**
 * One file in the files list: icon by extension, file name with the item
 * title under it, size, upload date and a download link. Like `ItemRow`, the title is a button whose
 * `::after` covers the row and opens the drawer. On mobile the details stack
 * under the title; from `sm` they sit in columns under `FileListHeader`.
 */
export const FileRow = ({ item }: FileRowProps) => {
  const { openItem } = useItemDrawer();
  // A file item whose upload failed has no file: it still lists and opens the
  // drawer (to edit or delete it), with nothing to download.
  const fileName = item.hasFile ? item.fileName : null;

  return (
    <li
      className="hover:bg-muted/40 has-focus-visible:ring-ring/50 relative flex items-center gap-3 px-4 py-3 transition-colors has-focus-visible:ring-3 has-focus-visible:ring-inset"
      style={{ "--type-color": item.type.color } as CSSProperties}
    >
      <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-(--type-color)/10">
        {/* createElement, like `TypeIcon`: the icon is picked from data. */}
        {createElement(getFileIcon(fileName), {
          className: "size-4 text-(--type-color)",
          "aria-hidden": true,
        })}
      </div>

      <div className={cn("min-w-0 flex-1", FILE_LIST_COLUMNS)}>
        <div className="min-w-0">
          <h3 className="font-medium">
            <button
              type="button"
              onClick={() => openItem(item)}
              className="block max-w-full truncate text-left outline-none after:absolute after:inset-0 after:content-['']"
            >
              {fileName ?? item.title}
            </button>
          </h3>
          <p className="text-muted-foreground truncate text-xs">{fileName ? item.title : "No file stored"}</p>
        </div>

        {/* One line on mobile; `contents` lets each become its own column from `sm`. */}
        <div className="text-muted-foreground flex gap-2 text-xs sm:contents sm:text-sm">
          <span>{fileName && item.fileSize !== null ? formatBytes(item.fileSize) : "—"}</span>
          <span aria-hidden className="sm:hidden">
            ·
          </span>
          <time dateTime={item.createdAt.toISOString()}>{formatLongDate(item.createdAt)}</time>
        </div>
      </div>

      {fileName ? (
        // Raised above the title's `::after`, so a click here lands on the link
        // and never reaches the button that opens the drawer. stopPropagation
        // also keeps it from any click handler an ancestor may gain later.
        <Button asChild variant="ghost" size="icon" className="relative z-10 shrink-0">
          <a
            href={itemFileHref(item.id, { download: true })}
            download={fileName}
            aria-label={`Download ${fileName}`}
            onClick={(event) => event.stopPropagation()}
          >
            <Download />
          </a>
        </Button>
      ) : (
        // Keeps the columns aligned with rows that have a button.
        <span className="size-8 shrink-0" aria-hidden />
      )}
    </li>
  );
};

/** Column headings over the file rows, from `sm` where the columns appear. */
export const FileListHeader = () => (
  <div className="text-muted-foreground hidden items-center gap-3 border-b px-4 py-2 text-xs font-medium sm:flex">
    {/* Spacers match the row's icon and download button. */}
    <span className="w-9 shrink-0" aria-hidden />
    <div className={cn("min-w-0 flex-1", FILE_LIST_COLUMNS)}>
      <span>Name</span>
      <span>Size</span>
      <span>Uploaded</span>
    </div>
    <span className="w-8 shrink-0" aria-hidden />
  </div>
);
