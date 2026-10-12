import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ITEM_SKELETON_COUNT } from "@/lib/constants/limits";

interface CollectionGridSkeletonProps {
  count?: number;
}

/**
 * Stand-in for the collections grid while it streams in: the count line, then
 * cards laid out like `CollectionCard` (name, item count, description, type
 * icons) in the same grid, so nothing shifts when the real cards replace it.
 */
export const CollectionGridSkeleton = ({ count = ITEM_SKELETON_COUNT }: CollectionGridSkeletonProps) => (
  <section className="flex flex-col gap-3" aria-busy="true" aria-label="Loading collections">
    <Skeleton className="h-5 w-24" />

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <Card key={index} className="border-l-4">
          <CardHeader className="flex flex-col gap-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3.5 w-12" />
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Skeleton className="h-3.5 w-5/6" />
            <div className="flex gap-2">
              <Skeleton className="size-4" />
              <Skeleton className="size-4" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </section>
);
