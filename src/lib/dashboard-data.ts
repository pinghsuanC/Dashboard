import {
  MOCK_ITEM_TYPES,
  MOCK_ITEMS,
  type Item,
  type ItemType,
} from "@/lib/mock-data";
import type { CollectionStats } from "@/lib/db/collections";

/**
 * The item slices the dashboard renders, still read from mock data.
 *
 * Collections moved to `@/lib/db/collections`; the functions below become
 * queries (`prisma.item.count()`, `orderBy: { updatedAt: 'desc' }`, `take: 10`)
 * when items follow.
 */

export const RECENT_ITEM_LIMIT = 10;

export interface ItemStats {
  items: number;
  favoriteItems: number;
}

export type DashboardStats = ItemStats & CollectionStats;

/**
 * Counted from `MOCK_ITEMS` rather than read off the types' `itemCount`, which
 * is a display-only mock number (24 snippets claimed, 3 present).
 *
 * KNOWN DEVIATION: the seed mirrors `MOCK_ITEMS`, so these match the database
 * today, but they are not queried. Switch to `prisma.item.count()` with items.
 */
export function getItemStats(): ItemStats {
  return {
    items: MOCK_ITEMS.length,
    favoriteItems: MOCK_ITEMS.filter((item) => item.isFavorite).length,
  };
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
