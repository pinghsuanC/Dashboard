import type { ReactNode } from "react";
import { Star } from "lucide-react";

import { FavoriteCollectionRow } from "@/components/favorites/FavoriteCollectionRow";
import { FavoriteItemRow } from "@/components/favorites/FavoriteItemRow";
import type { CollectionSummary } from "@/types/collections";
import type { ItemSummary } from "@/types/items";

interface FavoritesListProps {
  collections: CollectionSummary[];
  items: ItemSummary[];
}

interface FavoritesSectionProps {
  title: string;
  count: number;
  /** Shown in place of the rows when the section has none. */
  empty: string;
  children: ReactNode;
}

const FavoritesSection = ({ title, count, empty, children }: FavoritesSectionProps) => (
  <section className="flex flex-col gap-1" aria-label={title}>
    <h2 className="text-muted-foreground border-b px-2 pb-1 text-xs font-medium tracking-wider uppercase">
      {title} <span className="tabular-nums">({count})</span>
    </h2>
    {count > 0 ? (
      <ul className="divide-border/50 divide-y">{children}</ul>
    ) : (
      <p className="text-muted-foreground px-2 py-1.5">{empty}</p>
    )}
  </section>
);

/**
 * The favourites as two dense lists, collections then items, in a monospace
 * face. With none at all, one empty state stands in for both sections.
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
    <div className="flex flex-col gap-8 font-mono text-sm">
      <FavoritesSection title="Collections" count={collections.length} empty="No favorite collections.">
        {collections.map((collection) => (
          <FavoriteCollectionRow key={collection.id} collection={collection} />
        ))}
      </FavoritesSection>

      <FavoritesSection title="Items" count={items.length} empty="No favorite items.">
        {items.map((item) => (
          <FavoriteItemRow key={item.id} item={item} />
        ))}
      </FavoritesSection>
    </div>
  );
};
