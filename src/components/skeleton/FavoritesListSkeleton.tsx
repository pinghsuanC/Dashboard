import { CollectionGridSkeleton } from "@/components/skeleton/CollectionGridSkeleton";
import { ItemGridSkeleton } from "@/components/skeleton/ItemGridSkeleton";

/**
 * Stand-in for the favourites while they stream in: a collection grid then an
 * item grid, laid out like `FavoritesList`, so little shifts when the real
 * cards replace them.
 */
export const FavoritesListSkeleton = () => (
  <div className="flex flex-col gap-8" aria-busy="true" aria-label="Loading favorites">
    <CollectionGridSkeleton count={3} />
    <ItemGridSkeleton />
  </div>
);
