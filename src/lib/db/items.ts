import { Prisma } from "@/generated/prisma/client";
import { RECENT_ITEM_LIMIT } from "@/lib/constants/limits";
import { slugify } from "@/lib/helpers/slugify";
import { requireCurrentUserId } from "@/services/auth/session";
import { prisma } from "@/services/prisma";
import type { ItemCounts, ItemDetail, ItemSummary, ItemUpdate } from "@/types/items";

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

/**
 * Deletes one of the signed-in user's items. `false` when it is missing or
 * not theirs: the user scope is part of the delete itself, so another user's
 * id deletes nothing. Its tag and collection links go with it (cascade); the
 * tags and collections stay.
 */
export const deleteItem = async (id: string): Promise<boolean> => {
  const userId = await requireCurrentUserId();
  // `deleteMany`, not `delete`: no match is a count of 0, not a P2025 throw.
  const { count } = await prisma.item.deleteMany({ where: { id, userId } });
  return count > 0;
};
