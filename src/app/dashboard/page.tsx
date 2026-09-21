import type { Metadata } from "next";
import { Clock, Pin } from "lucide-react";

import { CollectionCard } from "@/components/collections/CollectionCard";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { StatCards } from "@/components/dashboard/StatCards";
import { ItemRow } from "@/components/items/ItemRow";
import {
  getDashboardStats,
  getItemTypesById,
  getPinnedItems,
  getRecentCollections,
  getRecentItems,
  RECENT_ITEM_LIMIT,
} from "@/lib/dashboard-data";

export const metadata: Metadata = {
  title: "Dashboard | DevStash",
  description: "Your developer knowledge hub.",
};

/**
 * Server component: the mock arrays are read here and only the rendered slices
 * exist in the output, so the full dataset never ships to the browser. Nothing
 * on this page is interactive yet, so no client boundary is needed.
 */
const DashboardPage = () => {
  const stats = getDashboardStats();
  const typesById = getItemTypesById();
  const collections = getRecentCollections();
  const pinnedItems = getPinnedItems();
  const recentItems = getRecentItems();

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

      <StatCards stats={stats} />

      <section>
        <SectionHeader title="Collections" href="/collections" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {collections.map((collection) => (
            <CollectionCard
              key={collection.id}
              collection={collection}
              typesById={typesById}
            />
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="Pinned" icon={Pin} size="sm" />
        {pinnedItems.length > 0 ? (
          <div className="flex flex-col gap-3">
            {pinnedItems.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                type={typesById.get(item.itemTypeId)}
              />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Nothing pinned yet. Pin an item to keep it here.
          </p>
        )}
      </section>

      <section>
        <SectionHeader
          title={`Recent (${RECENT_ITEM_LIMIT})`}
          icon={Clock}
          size="sm"
          href="/items"
        />
        <div className="flex flex-col gap-3">
          {recentItems.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              type={typesById.get(item.itemTypeId)}
            />
          ))}
        </div>
      </section>
    </div>
  );
};

export default DashboardPage;
