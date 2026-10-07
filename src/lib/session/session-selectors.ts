import { RECENT_COLLECTION_LIMIT, SIDEBAR_RECENT_COLLECTION_LIMIT } from "@/lib/constants/limits";
import type {
  CollectionStats,
  CollectionSummary,
  SessionCollection,
  SidebarCollection,
  SidebarCollections,
} from "@/types/collections";
import type { ItemCounts, ItemSummary } from "@/types/items";
import type { ItemStats } from "@/types/session";

/**
 * Display shapes derived from the user session. Pure functions, so a local
 * change to the session (an item pinned, a collection favourited) shows up on
 * the next render with no request. They re-apply the orderings and limits the
 * loaders use, so a list stays right after a local insert or update.
 */

// Newest first; title, then name, break `updatedAt` ties so the order is
// stable between renders (seeded rows share timestamps to the millisecond).
const newestItemFirst = (a: ItemSummary, b: ItemSummary) =>
  b.updatedAt.getTime() - a.updatedAt.getTime() || a.title.localeCompare(b.title);

const newestCollectionFirst = (a: SessionCollection, b: SessionCollection) =>
  b.updatedAt.getTime() - a.updatedAt.getTime() || a.name.localeCompare(b.name);

export const selectItemStats = (itemCounts: ItemCounts): ItemStats => ({
  items: itemCounts.total,
  favoriteItems: itemCounts.favorites,
});

export const selectCollectionStats = (collections: SessionCollection[]): CollectionStats => ({
  collections: collections.length,
  favoriteCollections: collections.filter((collection) => collection.isFavorite).length,
});

/** Pinned items only, newest first, so a local unpin drops the row. Unbounded. */
export const selectPinnedItems = (pinnedItems: ItemSummary[]): ItemSummary[] =>
  pinnedItems.filter((item) => item.isPinned).sort(newestItemFirst);

/** Most recently updated collections, for the dashboard cards. */
export const selectRecentCollections = (
  collections: SessionCollection[],
  limit: number = RECENT_COLLECTION_LIMIT,
): CollectionSummary[] =>
  [...collections]
    .sort(newestCollectionFirst)
    .slice(0, limit)
    .map(({ id, name, slug, description, isFavorite, itemCount, types }) => ({
      id,
      name,
      slug,
      description,
      isFavorite,
      itemCount,
      types,
    }));

/** Every favorite (alphabetical) and the most recently updated non-favorites. */
export const selectSidebarCollections = (
  collections: SessionCollection[],
  recentLimit: number = SIDEBAR_RECENT_COLLECTION_LIMIT,
): SidebarCollections => {
  const toRow = ({ id, name, slug, itemCount, types }: SessionCollection): SidebarCollection => ({
    id,
    name,
    slug,
    itemCount,
    color: types[0]?.color ?? null,
  });

  return {
    favorites: collections
      .filter((collection) => collection.isFavorite)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(toRow),
    recents: collections
      .filter((collection) => !collection.isFavorite)
      .sort(newestCollectionFirst)
      .slice(0, recentLimit)
      .map(toRow),
  };
};
