import { RECENT_ITEM_LIMIT } from "@/lib/constants/limits";
import { requireCurrentUserId } from "@/lib/db/current-user";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";
import { Prisma } from "@/generated/prisma/client";

/** The slice of an item type an item row needs for its icon and accent. */
export interface ItemRowType {
  id: string;
  /** Stable key ("snippet", "link"): what per-type rules check. `label` is display text. */
  name: string;
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
  type: { select: { id: true, name: true, label: true, icon: true, color: true } },
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

/** A collection an item belongs to, as the detail view links it. */
export interface ItemCollectionRef {
  id: string;
  name: string;
}

/** An item with its body, for the item drawer. Loaded on demand by id. */
export interface ItemDetail extends ItemSummary {
  content: string | null;
  language: string | null;
  url: string | null;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  createdAt: Date;
  /** By name: the join table records no order of its own. */
  collections: ItemCollectionRef[];
}

const itemDetailSelect = {
  ...itemSummarySelect,
  content: true,
  language: true,
  url: true,
  fileName: true,
  fileSize: true,
  mimeType: true,
  createdAt: true,
  collections: {
    select: { collection: { select: { id: true, name: true } } },
    orderBy: { collection: { name: "asc" } },
  },
} satisfies Prisma.ItemSelect;

type ItemDetailRow = Prisma.ItemGetPayload<{ select: typeof itemDetailSelect }>;

const toItemDetail = ({ tags, collections, ...item }: ItemDetailRow): ItemDetail => ({
  ...item,
  tags: tags.map(({ tag }) => tag.name),
  collections: collections.map(({ collection }) => collection),
});

/**
 * One item with its body, for the item drawer. Scoped to the signed-in user in
 * the query itself, so another user's id finds nothing: `null` means missing
 * or not theirs, and callers can't tell which.
 */
export const getItemDetail = async (id: string): Promise<ItemDetail | null> => {
  const userId = await requireCurrentUserId();
  const item = await prisma.item.findFirst({ where: { id, userId }, select: itemDetailSelect });
  return item && toItemDetail(item);
};

/**
 * The type name of one of the signed-in user's items, for the per-type edit
 * rules; `null` when it is missing or not theirs.
 */
export const getItemTypeName = async (id: string): Promise<string | null> => {
  const userId = await requireCurrentUserId();
  const item = await prisma.item.findFirst({
    where: { id, userId },
    select: { type: { select: { name: true } } },
  });
  return item?.type.name ?? null;
};

/**
 * An item edit, already validated. A field left `undefined` is not written;
 * `null` clears it. `tags` replaces the item's tags by name.
 */
export interface ItemUpdate {
  title: string;
  description?: string | null;
  content?: string | null;
  language?: string | null;
  url?: string | null;
  tags?: string[];
}

/**
 * Saves an edit to one of the signed-in user's items and returns it as the
 * drawer shows it. `null` when the item is missing or not theirs: the user
 * scope is part of the write itself, so another user's id changes nothing.
 */
export const updateItem = async (
  id: string,
  { tags, ...fields }: ItemUpdate,
): Promise<ItemDetail | null> => {
  const userId = await requireCurrentUserId();
  try {
    const item = await prisma.item.update({
      where: { id, userId },
      data: {
        ...fields,
        // Drop every link, then link each name to the user's tag with its
        // slug, creating the tags they don't have yet.
        tags: tags && {
          deleteMany: {},
          create: tags.map((name) => {
            const slug = slugify(name);
            return {
              tag: {
                connectOrCreate: {
                  where: { userId_slug: { userId, slug } },
                  create: { userId, name, slug },
                },
              },
            };
          }),
        },
      },
      select: itemDetailSelect,
    });
    return toItemDetail(item);
  } catch (error) {
    if (isRecordNotFound(error)) return null;
    throw error;
  }
};

// Prisma's answer when an update's `where` matches no row.
const isRecordNotFound = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
