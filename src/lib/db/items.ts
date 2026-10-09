import { Prisma } from "@/generated/prisma/client";
import { RECENT_ITEM_LIMIT } from "@/lib/constants/limits";
import { slugify } from "@/lib/helpers/slugify";
import { requireCurrentUserId } from "@/services/auth/session";
import { prisma } from "@/services/prisma";
import type { ItemFileFields, ItemFileRef } from "@/types/files";
import type { DeletedItem, ItemCounts, ItemCreate, ItemDetail, ItemSummary, ItemUpdate } from "@/types/items";

const itemSummarySelect = {
  id: true,
  title: true,
  description: true,
  isPinned: true,
  isFavorite: true,
  createdAt: true,
  updatedAt: true,
  fileName: true,
  fileSize: true,
  // Read only to set `hasFile`; the mappers drop the key itself.
  fileKey: true,
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

const toItemSummary = ({ tags, fileKey, ...item }: ItemSummaryRow): ItemSummary => ({
  ...item,
  tags: tags.map(({ tag }) => tag.name),
  hasFile: fileKey !== null,
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
  mimeType: true,
  collections: {
    select: { collection: { select: { id: true, name: true } } },
    orderBy: { collection: { name: "asc" } },
  },
} satisfies Prisma.ItemSelect;

type ItemDetailRow = Prisma.ItemGetPayload<{ select: typeof itemDetailSelect }>;

const toItemDetail = ({ tags, collections, fileKey, ...item }: ItemDetailRow): ItemDetail => ({
  ...item,
  tags: tags.map(({ tag }) => tag.name),
  hasFile: fileKey !== null,
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

// One tag link per name, to the user's tag with its slug, creating the tags
// they don't have yet. Another user's tag with the same slug is never used.
const tagLinks = (userId: string, names: string[]) =>
  names.map((name) => {
    const slug = slugify(name);
    return {
      tag: {
        connectOrCreate: {
          where: { userId_slug: { userId, slug } },
          create: { userId, name, slug },
        },
      },
    };
  });

/**
 * Saves an edit to one of the signed-in user's items and returns it as the
 * drawer shows it. `null` when the item is missing or not theirs: the user
 * scope is part of the write itself, so another user's id changes nothing.
 * An edit that sends tags also deletes the tags it left unused.
 */
export const updateItem = async (
  id: string,
  { tags, ...fields }: ItemUpdate,
): Promise<ItemDetail | null> => {
  const userId = await requireCurrentUserId();
  try {
    const item = await prisma.$transaction(async (tx) => {
      const saved = await tx.item.update({
        where: { id, userId },
        data: {
          ...fields,
          // Drop every link, then link the new names.
          tags: tags && { deleteMany: {}, create: tagLinks(userId, tags) },
        },
        select: itemDetailSelect,
      });
      if (tags) await deleteUnusedTags(tx, userId);
      return saved;
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
 * Deletes the user's tags that no item links any more, so they don't pile up
 * or decide a later tag's spelling (tags are matched by slug). Every unused
 * tag of the user goes, not only the item's old ones, so leftovers from
 * before this cleanup existed go too. Runs inside the write's transaction.
 *
 * Known gap: the same user saving in two tabs at once could have one write
 * link a tag that the other's cleanup has just found unused. The link then
 * goes with the tag (cascade), and the item silently loses that tag.
 */
const deleteUnusedTags = (tx: Prisma.TransactionClient, userId: string) =>
  tx.tag.deleteMany({ where: { userId, items: { none: {} } } });

/**
 * Deletes one of the signed-in user's items and returns its stored file's
 * key, for the caller to delete from storage. `null` when it is missing or
 * not theirs: the user scope is part of the delete itself, so another user's
 * id deletes nothing. Its tag and collection links go with it (cascade); the
 * collections stay, and tags no other item uses are deleted.
 */
export const deleteItem = async (id: string): Promise<DeletedItem | null> => {
  const userId = await requireCurrentUserId();
  return prisma.$transaction(async (tx) => {
    // Read in the same transaction, so the key is the deleted row's own.
    const item = await tx.item.findFirst({ where: { id, userId }, select: { fileKey: true } });
    if (!item) return null;
    // `deleteMany`, not `delete`: no match is a count of 0, not a P2025 throw.
    const { count } = await tx.item.deleteMany({ where: { id, userId } });
    if (count === 0) return null;
    await deleteUnusedTags(tx, userId);
    return { fileKey: item.fileKey };
  });
};

/**
 * Writes the stored file's key and details onto one of the signed-in user's
 * items, once its upload link is signed. `null` when the item is missing or
 * not theirs: the user scope is part of the write.
 */
export const setItemFile = async (id: string, file: ItemFileFields): Promise<ItemDetail | null> => {
  const userId = await requireCurrentUserId();
  try {
    const item = await prisma.item.update({ where: { id, userId }, data: file, select: itemDetailSelect });
    return toItemDetail(item);
  } catch (error) {
    if (isRecordNotFound(error)) return null;
    throw error;
  }
};

/**
 * Where one of the signed-in user's items keeps its file, for the file route.
 * `null` when the item is missing, not theirs, or holds no file.
 */
export const getItemFile = async (id: string): Promise<ItemFileRef | null> => {
  const userId = await requireCurrentUserId();
  const item = await prisma.item.findFirst({
    where: { id, userId },
    select: { fileKey: true, fileName: true, mimeType: true, fileSize: true, type: { select: { name: true } } },
  });
  if (!item?.fileKey) return null;
  const { type, ...file } = item;
  return { ...file, typeName: type.name, fileKey: item.fileKey };
};

/**
 * Creates an item of a built-in type for the signed-in user and returns it as
 * the drawer shows it. The owner comes from the session, never the input.
 * `null` when no built-in type has that name: a user-owned type, even one
 * named like a built-in, is never used.
 */
export const createItem = async (
  typeName: string,
  { tags, ...fields }: ItemCreate,
): Promise<ItemDetail | null> => {
  const userId = await requireCurrentUserId();
  const type = await prisma.itemType.findFirst({
    where: { name: typeName, isSystem: true, userId: null },
    select: { id: true },
  });
  if (!type) return null;

  const item = await prisma.item.create({
    data: {
      ...fields,
      userId,
      typeId: type.id,
      tags: tags && { create: tagLinks(userId, tags) },
    },
    select: itemDetailSelect,
  });
  return toItemDetail(item);
};
