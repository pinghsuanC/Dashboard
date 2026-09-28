import type { Metadata } from "next";
import { connection } from "next/server";
import { Clock, Pin } from "lucide-react";

import { CollectionCard } from "@/components/collections/CollectionCard";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { StatCards } from "@/components/dashboard/StatCards";
import { ItemRow } from "@/components/items/ItemRow";
import {
  getCollectionStats,
  getRecentCollections,
} from "@/lib/db/collections";
import { getDemoUserId } from "@/lib/db/demo-user";
import { getItemStats, getPinnedItems, getRecentItems } from "@/lib/db/items";

export const metadata: Metadata = {
  title: "Dashboard | DevStash",
  description: "Your developer knowledge hub.",
};

/**
 * Server component: everything is queried here and only the rendered slices
 * reach the browser. Nothing on this page is interactive yet, so no client
 * boundary is needed.
 */
const DashboardPage = async () => {
  // Nothing here reads cookies or headers yet, so without this Next would
  // prerender the page at build time and freeze the database results.
  await connection();

  const userId = await getDemoUserId();
  const [collections, collectionStats, itemStats, pinnedItems, recentItems] =
    await Promise.all([
      getRecentCollections(userId),
      getCollectionStats(userId),
      getItemStats(userId),
      getPinnedItems(userId),
      getRecentItems(userId),
    ]);

  const stats = { ...itemStats, ...collectionStats };

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
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </div>
      </section>

      {pinnedItems.length > 0 && (
        <section>
          <SectionHeader title="Pinned" icon={Pin} size="sm" />
          <div className="flex flex-col gap-3">
            {pinnedItems.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionHeader
          title={`Recent (${recentItems.length})`}
          icon={Clock}
          size="sm"
          href="/items"
        />
        <div className="flex flex-col gap-3">
          {recentItems.map((item) => (
            <ItemRow key={item.id} item={item} />
          ))}
        </div>
      </section>
    </div>
  );
};

export default DashboardPage;
