import { Skeleton } from "@/components/ui/skeleton";
import { ITEM_SKELETON_COUNT } from "@/lib/constants/limits";
import { FILE_LIST_COLUMNS } from "@/lib/constants/ui";
import { cn } from "@/lib/utils";

interface FileListSkeletonProps {
  count?: number;
}

/**
 * Stand-in for the files list while its items stream in: the count line, then
 * rows laid out like `FileRow` (icon tile, title and file name, size, date,
 * download) under the same column headings, so nothing shifts when the real
 * rows replace it.
 */
export const FileListSkeleton = ({ count = ITEM_SKELETON_COUNT }: FileListSkeletonProps) => (
  <section className="flex flex-col gap-3" aria-busy="true" aria-label="Loading items">
    <Skeleton className="h-5 w-16" />

    <div className="rounded-lg border">
      <div className="hidden items-center gap-3 border-b px-4 py-2 sm:flex">
        <span className="w-9 shrink-0" />
        <div className={cn("min-w-0 flex-1", FILE_LIST_COLUMNS)}>
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-3 w-14" />
        </div>
        <span className="w-8 shrink-0" />
      </div>

      <ul className="divide-y">
        {Array.from({ length: count }, (_, index) => (
          <li key={index} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="size-9 shrink-0 rounded-lg" />
            <div className={cn("flex min-w-0 flex-1 flex-col gap-1.5 sm:gap-4", FILE_LIST_COLUMNS)}>
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <div className="flex gap-2 sm:contents">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="size-8 shrink-0 rounded-md" />
          </li>
        ))}
      </ul>
    </div>
  </section>
);
