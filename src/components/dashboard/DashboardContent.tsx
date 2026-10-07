"use client";

import { useMemo } from "react";
import { Clock, Pin } from "lucide-react";

import { CollectionCard } from "@/components/collections/CollectionCard";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { StatCards } from "@/components/dashboard/StatCards";
import { ItemRow } from "@/components/items/ItemRow";
import { useUserSession } from "@/components/session/UserSessionProvider";
import { ROUTES } from "@/lib/constants/routes";
import type { ItemSummary } from "@/lib/db/items";
import {
  selectCollectionStats,
  selectItemStats,
  selectPinnedItems,
  selectRecentCollections,
} from "@/lib/session/session-selectors";

interface DashboardContentProps {
  /** Fetched by the page on every visit; not kept in the session. */
  recentItems: ItemSummary[];
}

/**
 * Everything below the dashboard header. Stats, collections and pinned items
 * come from the user session, so a local change shows up immediately; recent
 * items arrive fresh from the page.
 */
export const DashboardContent = ({ recentItems }: DashboardContentProps) => {
  const { itemCounts, pinnedItems: sessionPinned, collections } = useUserSession();

  const { stats, recentCollections, pinnedItems } = useMemo(
    () => ({
      stats: { ...selectItemStats(itemCounts), ...selectCollectionStats(collections) },
      recentCollections: selectRecentCollections(collections),
      pinnedItems: selectPinnedItems(sessionPinned),
    }),
    [itemCounts, sessionPinned, collections],
  );

  return (
    <>
      <StatCards stats={stats} />

      <section>
        <SectionHeader title="Collections" href={ROUTES.collections} />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {recentCollections.map((collection) => (
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
          href={ROUTES.items}
        />
        <div className="flex flex-col gap-3">
          {recentItems.map((item) => (
            <ItemRow key={item.id} item={item} />
          ))}
        </div>
      </section>
    </>
  );
};
