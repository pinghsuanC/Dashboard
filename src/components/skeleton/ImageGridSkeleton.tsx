import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ITEM_SKELETON_COUNT } from "@/lib/constants/limits";

interface ImageGridSkeletonProps {
  count?: number;
}

/**
 * Stand-in for the image gallery while its items stream in: the count line,
 * then 16:9 tiles with a title row in the same grid as `ImageCard`, so
 * nothing shifts when the real tiles replace it.
 */
export const ImageGridSkeleton = ({ count = ITEM_SKELETON_COUNT }: ImageGridSkeletonProps) => (
  <section className="flex flex-col gap-3" aria-busy="true" aria-label="Loading items">
    <Skeleton className="h-5 w-16" />

    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <Card key={index} className="gap-0 py-0">
          <Skeleton className="aspect-video rounded-none" />
          <div className="flex items-center gap-2 p-3">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="ml-auto h-3 w-10" />
          </div>
        </Card>
      ))}
    </div>
  </section>
);
