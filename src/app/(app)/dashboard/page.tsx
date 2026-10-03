import type { Metadata } from "next";

import { DashboardContent } from "@/components/dashboard/DashboardContent";
import { DASHBOARD_DESCRIPTION } from "@/lib/constants/app";
import { getRecentItems } from "@/lib/db/items";

export const metadata: Metadata = {
  title: "Dashboard",
  description: DASHBOARD_DESCRIPTION,
};

/**
 * Only the recent items are queried here, on every visit (pages re-render on
 * navigation; the layout does not). Stats, collections and pinned items come
 * from the user session the `(app)` layout loaded.
 */
const DashboardPage = async () => {
  const recentItems = await getRecentItems();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <header>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Your developer knowledge hub
        </p>
      </header>

      <DashboardContent recentItems={recentItems} />
    </div>
  );
};

export default DashboardPage;
