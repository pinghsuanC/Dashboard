import { Pagination } from "@/components/shared/Pagination";
import { Badge } from "@/components/ui/badge";
import { ROUTES } from "@/lib/constants/routes";
import { formatLongDate } from "@/lib/helpers/format";
import type { PastSubscription, SubscriptionState } from "@/types/billing";
import type { Paginated } from "@/types/pagination";

const STATE_LABELS: Record<SubscriptionState, string> = {
  active: "Active",
  ended: "Ended",
};

const dateOrDash = (date: Date | null) => (date ? formatLongDate(date) : "—");

/** One page of past subscriptions, newest first, with the page links under it. */
export const SubscriptionList = ({ rows, page, pageCount }: Paginated<PastSubscription>) => {
  if (rows.length === 0) {
    return <p className="text-muted-foreground text-sm">No subscriptions yet.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="divide-border divide-y">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {row.interval === "YEAR" ? "Yearly" : "Monthly"}
                {row.source === "granted" ? " · Trial" : null}
              </p>
              <p className="text-muted-foreground text-xs">
                {dateOrDash(row.periodStart)} – {dateOrDash(row.periodEnd)}
              </p>
            </div>
            <Badge variant={row.state === "active" ? "default" : "secondary"} className="self-start sm:self-auto">
              {STATE_LABELS[row.state]}
            </Badge>
          </li>
        ))}
      </ul>

      <Pagination path={ROUTES.billings} page={page} pageCount={pageCount} />
    </div>
  );
};
