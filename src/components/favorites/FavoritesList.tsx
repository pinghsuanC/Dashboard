import { Folder, LayoutGrid, Star } from "lucide-react";

import { CollectionCard } from "@/components/collections/CollectionCard";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { ItemRow } from "@/components/items/ItemRow";
import type { CollectionSummary } from "@/types/collections";
import type { ItemSummary } from "@/types/items";

interface FavoritesListProps {
  collections: CollectionSummary[];
  items: ItemSummary[];
}

/**
 * The favourites in two sections, collections then items, as the same cards
 * and grids the collections and item type pages use. A section with none says
 * so; with none at all, one empty state stands in for both.
 */
export const FavoritesList = ({ collections, items }: FavoritesListProps) => {
  if (collections.length === 0 && items.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-col items-center gap-2 py-16 text-center">
        <Star className="size-8" aria-hidden />
        <p className="text-foreground font-medium">No favorites yet</p>
        <p className="text-sm">Star an item or a collection and it shows up here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <SectionHeader title={`Collections (${collections.length})`} icon={Folder} size="sm" />
        {collections.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {collections.map((collection) => (
              <CollectionCard key={collection.id} collection={collection} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No favorite collections.</p>
        )}
      </section>

      <section>
        <SectionHeader title={`Items (${items.length})`} icon={LayoutGrid} size="sm" />
        {items.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {items.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No favorite items.</p>
        )}
      </section>
    </div>
  );
};
