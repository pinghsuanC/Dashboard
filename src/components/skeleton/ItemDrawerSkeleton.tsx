import { Skeleton } from "@/components/ui/skeleton";

/*
 * Stand-ins for the drawer sections that wait on the fetch, in two parts so
 * each sits where its section will appear: content above the tags, then
 * collections and dates below them. The header, actions, description and tags
 * come from the card and are never skeletons.
 */

export const ItemContentSkeleton = () => (
  <div className="flex flex-col gap-2" aria-hidden="true">
    <Skeleton className="h-4 w-16" />
    <Skeleton className="h-40 w-full rounded-lg" />
  </div>
);

export const ItemMetaSkeleton = () => (
  <div className="flex flex-col gap-6" aria-hidden="true">
    <div className="flex flex-col gap-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-6 w-32 rounded-full" />
    </div>
    <div className="flex flex-col gap-2">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
    </div>
  </div>
);
