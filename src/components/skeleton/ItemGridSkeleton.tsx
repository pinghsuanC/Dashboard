import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ITEM_SKELETON_COUNT } from "@/lib/constants/limits";

interface ItemGridSkeletonProps {
  count?: number;
}

/**
 * Stand-in for an item grid while its items stream in: the count line, then
 * cards laid out like `ItemRow` (icon tile, title and date, description,
 * tags) in the same grid, so nothing shifts when the real cards replace it.
 * The left edge stays neutral until the type colour arrives with the items.
 */
export const ItemGridSkeleton = ({ count = ITEM_SKELETON_COUNT }: ItemGridSkeletonProps) => (
  <section className="flex flex-col gap-3" aria-busy="true" aria-label="Loading items">
    <Skeleton className="h-5 w-16" />

    <div className="grid gap-3 md:grid-cols-2">
      {Array.from({ length: count }, (_, index) => (
        <Card key={index} size="sm" className="border-l-4">
          <CardContent className="flex items-start gap-3">
            <Skeleton className="size-9 shrink-0 rounded-lg" />

            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="ml-auto h-3 w-10" />
              </div>
              <Skeleton className="h-3.5 w-5/6" />
              <div className="flex gap-1.5">
                <Skeleton className="h-5 w-14 rounded-full" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </section>
);
