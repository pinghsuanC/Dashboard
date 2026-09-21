import {
  MOCK_COLLECTIONS,
  MOCK_ITEM_TYPES,
  MOCK_ITEMS,
  type Collection,
  type Item,
  type ItemType,
} from "@/lib/mock-data";

/**
 * Every slice the dashboard renders, derived in one place.
 *
 * The page and its cards stay declarative; when Prisma lands, each function
 * below becomes a query (`prisma.item.count()`, `orderBy: { updatedAt: 'desc' }`,
 * `take: 10`) and nothing above this file has to change.
 */

export const RECENT_COLLECTION_LIMIT = 6;
export const RECENT_ITEM_LIMIT = 10;

export interface DashboardStats {
  items: number;
  collections: number;
  favoriteItems: number;
  favoriteCollections: number;
}

/**
 * Counted from the arrays rather than read off `itemCount`: the `itemCount`
 * fields on types and collections are display-only mock numbers that do not
 * agree with `MOCK_ITEMS` (24 snippets claimed, 3 present). These four stats
 * must be internally consistent, so they are derived.
 */
export function getDashboardStats(): DashboardStats {
  return {
    items: MOCK_ITEMS.length,
    collections: MOCK_COLLECTIONS.length,
    favoriteItems: MOCK_ITEMS.filter((item) => item.isFavorite).length,
    favoriteCollections: MOCK_COLLECTIONS.filter((c) => c.isFavorite).length,
  };
}

/**
 * KNOWN DEVIATION: `Collection` carries no `createdAt`/`updatedAt`, so there is
 * nothing to sort by and array order stands in for recency. The planned Prisma
 * model does have both columns — swap this for `orderBy: { updatedAt: 'desc' }`
 * when the database lands.
 */
export function getRecentCollections(
  limit: number = RECENT_COLLECTION_LIMIT,
): Collection[] {
  return MOCK_COLLECTIONS.slice(0, limit);
}

function byNewestFirst(a: Item, b: Item) {
  return b.updatedAt.localeCompare(a.updatedAt);
}

export function getPinnedItems(): Item[] {
  return MOCK_ITEMS.filter((item) => item.isPinned).sort(byNewestFirst);
}

export function getRecentItems(limit: number = RECENT_ITEM_LIMIT): Item[] {
  // `sort` mutates, so copy first — MOCK_ITEMS is a module-level singleton and
  // reordering it would leak into every other caller in the same process.
  return [...MOCK_ITEMS].sort(byNewestFirst).slice(0, limit);
}

/** Items reference their type by id; the UI needs the label, icon and colour. */
export function getItemTypesById(): Map<string, ItemType> {
  return new Map(MOCK_ITEM_TYPES.map((type) => [type.id, type]));
}
