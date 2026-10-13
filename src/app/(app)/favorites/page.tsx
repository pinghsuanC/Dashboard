import { Suspense } from "react";
import type { Metadata } from "next";

import { FavoritesList } from "@/components/favorites/FavoritesList";
import { FavoritesListSkeleton } from "@/components/skeleton/FavoritesListSkeleton";
import { getFavoriteCollections } from "@/lib/db/collections";
import { getFavoriteItems } from "@/lib/db/items";

export const metadata: Metadata = {
  title: "Favorites",
};

/** The slow part, streamed behind the skeleton: both lists, queried together. */
const Favorites = async () => {
  const [collections, items] = await Promise.all([getFavoriteCollections(), getFavoriteItems()]);

  return <FavoritesList collections={collections} items={items} />;
};

/**
 * Every favourite collection and item, queried on each visit rather than read
 * from the user session, so a star added elsewhere shows on the next visit.
 */
const FavoritesPage = () => (
  <div className="mx-auto flex max-w-4xl flex-col gap-6">
    <header>
      <h1 className="font-heading text-3xl font-semibold tracking-tight">Favorites</h1>
    </header>

    <Suspense fallback={<FavoritesListSkeleton />}>
      <Favorites />
    </Suspense>
  </div>
);

export default FavoritesPage;
