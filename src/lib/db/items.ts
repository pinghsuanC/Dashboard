import { RECENT_ITEM_LIMIT } from "@/lib/constants/limits";
import { requireCurrentUserId } from "@/lib/db/current-user";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

/** The slice of an item type an item row needs for its icon and accent. */
export interface ItemRowType {
  id: string;
  label: string;
  icon: string | null;
  color: string;
}

/**
 * An item as list rows show it, without the body (content, url, file
 * fields). The detail view loads those on demand.
 */
export interface ItemSummary {
  id: string;
  title: string;
  description: string | null;
  isPinned: boolean;
  isFavorite: boolean;
  updatedAt: Date;
  /** Tag names, alphabetical: the join table records no order of its own. */
  tags: string[];
  /**
   * Embedded rather than looked up in the session's type list: that list is
   * the system types, and a Pro user's items can use their own types.
   */
  type: ItemRowType;
}

/**
 * The user's item numbers, for display without loading the items: stat
 * cards, sidebar badges, profile usage.
 */
export interface ItemCounts {
  total: number;
  favorites: number;
  /** Item count per type id. Types with no items are absent; read with `?? 0`. */
  byType: Record<string, number>;
}

const itemSummarySelect = {
  id: true,
  title: true,
  description: true,
  isPinned: true,
  isFavorite: true,
  updatedAt: true,
  type: { select: { id: true, label: true, icon: true, color: true } },
  tags: {
    select: { tag: { select: { name: true } } },
    orderBy: { tag: { name: "asc" } },
  },
} satisfies Prisma.ItemSelect;

// Title breaks `updatedAt` ties so the order is stable between requests.
const newestFirst = [
  { updatedAt: "desc" },
  { title: "asc" },
] satisfies Prisma.ItemOrderByWithRelationInput[];

type ItemSummaryRow = Prisma.ItemGetPayload<{
  select: typeof itemSummarySelect;
}>;

const toItemSummary = ({ tags, ...item }: ItemSummaryRow): ItemSummary => ({
  ...item,
  tags: tags.map(({ tag }) => tag.name),
});

/**
 * Counted in the database (indexed by `[userId, typeId]` and
 * `[userId, isFavorite]`): only numbers come back, never item rows.
 */
export const getItemCounts = async (): Promise<ItemCounts> => {
  const userId = await requireCurrentUserId();
  const [groups, favorites] = await Promise.all([
    prisma.item.groupBy({ by: ["typeId"], where: { userId }, _count: { _all: true } }),
    prisma.item.count({ where: { userId, isFavorite: true } }),
  ]);
  const byType = Object.fromEntries(groups.map((group) => [group.typeId, group._count._all]));
  const total = groups.reduce((sum, group) => sum + group._count._all, 0);
  return { total, favorites, byType };
};

/** Every pinned item, newest first. Unbounded: pinning is a deliberate act. */
export const getPinnedItems = async (): Promise<ItemSummary[]> => {
  const userId = await requireCurrentUserId();
  const items = await prisma.item.findMany({
    where: { userId, isPinned: true },
    orderBy: newestFirst,
    select: itemSummarySelect,
  });
  return items.map(toItemSummary);
};

/**
 * Not part of the user session: the dashboard fetches it on every visit, so
 * it is always current without local upkeep.
 */
export const getRecentItems = async (
  limit: number = RECENT_ITEM_LIMIT,
): Promise<ItemSummary[]> => {
  const userId = await requireCurrentUserId();
  const items = await prisma.item.findMany({
    where: { userId },
    orderBy: newestFirst,
    take: limit,
    select: itemSummarySelect,
  });
  return items.map(toItemSummary);
};

/**
 * Every item of one type, newest first, for `/items/[type]`. Unbounded for
 * now, like the pinned list; fetched by the page on each visit.
 */
export const getItemsByType = async (typeId: string): Promise<ItemSummary[]> => {
  const userId = await requireCurrentUserId();
  const items = await prisma.item.findMany({
    where: { userId, typeId },
    orderBy: newestFirst,
    select: itemSummarySelect,
  });
  return items.map(toItemSummary);
};
