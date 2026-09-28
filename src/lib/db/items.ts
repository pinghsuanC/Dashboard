import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export const RECENT_ITEM_LIMIT = 10;

/** The slice of an item type an item row needs for its icon and accent. */
export interface ItemRowType {
  id: string;
  label: string;
  icon: string | null;
  color: string;
}

export interface ItemSummary {
  id: string;
  title: string;
  description: string | null;
  isPinned: boolean;
  isFavorite: boolean;
  updatedAt: Date;
  /** Tag names, alphabetical: the join table records no order of its own. */
  tags: string[];
  type: ItemRowType;
}

export interface SidebarItemType {
  id: string;
  /** Slug: "snippet", "file", ... */
  name: string;
  label: string;
  icon: string | null;
  color: string;
  /** `/items/snippets`: routes are plural, the stored type `name` is not. */
  route: string;
  /** The user's items of this type. */
  itemCount: number;
}

export interface ItemStats {
  items: number;
  favoriteItems: number;
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

function toItemSummary({ tags, ...item }: ItemSummaryRow): ItemSummary {
  return { ...item, tags: tags.map(({ tag }) => tag.name) };
}

/** Every pinned item, newest first. Unbounded: pinning is a deliberate act. */
export async function getPinnedItems(userId: string): Promise<ItemSummary[]> {
  const items = await prisma.item.findMany({
    where: { userId, isPinned: true },
    orderBy: newestFirst,
    select: itemSummarySelect,
  });
  return items.map(toItemSummary);
}

export async function getRecentItems(
  userId: string,
  limit: number = RECENT_ITEM_LIMIT,
): Promise<ItemSummary[]> {
  const items = await prisma.item.findMany({
    where: { userId },
    orderBy: newestFirst,
    take: limit,
    select: itemSummarySelect,
  });
  return items.map(toItemSummary);
}

/**
 * The built-in types with how many items the user has of each.
 * Custom (Pro) types are not listed yet.
 */
export async function getSystemItemTypes(
  userId: string,
): Promise<SidebarItemType[]> {
  const types = await prisma.itemType.findMany({
    where: { isSystem: true },
    orderBy: [{ createdAt: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      label: true,
      icon: true,
      color: true,
      _count: { select: { items: { where: { userId } } } },
    },
  });

  return types.map(({ name, _count, ...type }) => ({
    ...type,
    name,
    // Every system type pluralizes with a plain "s" (snippet -> snippets).
    route: `/items/${name}s`,
    itemCount: _count.items,
  }));
}

export async function getItemStats(userId: string): Promise<ItemStats> {
  const [items, favoriteItems] = await Promise.all([
    prisma.item.count({ where: { userId } }),
    prisma.item.count({ where: { userId, isFavorite: true } }),
  ]);
  return { items, favoriteItems };
}
