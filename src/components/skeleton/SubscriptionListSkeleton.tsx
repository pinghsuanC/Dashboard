import { Skeleton } from "@/components/ui/skeleton";

/**
 * Stand-in for the past subscriptions while they stream in: rows laid out
 * like `SubscriptionList` (type, dates, state badge), so little shifts.
 */
export const SubscriptionListSkeleton = () => (
  <ul className="divide-border divide-y" aria-busy="true" aria-label="Loading subscriptions">
    {Array.from({ length: 3 }, (_, index) => (
      <li key={index} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-5 w-14 rounded-full" />
      </li>
    ))}
  </ul>
);
