import { Skeleton } from "@/components/ui/skeleton";
import { ITEM_SKELETON_COUNT } from "@/lib/constants/limits";

const SkeletonSection = ({ rows }: { rows: number }) => (
  <div className="flex flex-col gap-1">
    <div className="border-b px-2 pb-1">
      <Skeleton className="h-4 w-28" />
    </div>
    <ul className="divide-border/50 divide-y">
      {Array.from({ length: rows }, (_, index) => (
        <li key={index} className="flex items-center gap-3 px-2 py-1.5">
          <Skeleton className="size-4 shrink-0" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-5 w-16 shrink-0" />
        </li>
      ))}
    </ul>
  </div>
);

/**
 * Stand-in for the favourites while they stream in: two sections of rows laid
 * out like `FavoritesList` (icon, title, badge), so nothing shifts when the
 * real rows replace it.
 */
export const FavoritesListSkeleton = () => (
  <div className="flex flex-col gap-8" aria-busy="true" aria-label="Loading favorites">
    <SkeletonSection rows={3} />
    <SkeletonSection rows={ITEM_SKELETON_COUNT} />
  </div>
);
