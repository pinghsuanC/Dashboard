import { Prisma } from "@/generated/prisma/client";
import { CollectionNotFoundError } from "@/lib/collections/collection-errors";
import { DASHBOARD_RECENT_ITEMS_LIMIT, ITEMS_PER_PAGE, SEARCH_ITEM_LIMIT } from "@/lib/constants/limits";
import { isRecordNotFound } from "@/lib/db/prisma-errors";
import { loadPage } from "@/lib/helpers/pagination";
import { slugify } from "@/lib/helpers/slugify";
import { requireCurrentUserId } from "@/services/auth/session";
import { prisma } from "@/services/prisma";
import type { ItemFileFields, ItemFileRef } from "@/types/files";
import type { DeletedItem, ItemCounts, ItemCreate, ItemDetail, ItemSummary, ItemUpdate } from "@/types/items";
import type { Paginated } from "@/types/pagination";

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

// Title, then id, break `updatedAt` ties so the order is stable between
// requests: with `skip`, an unstable order could show a row on two pages.
const newestFirst = [
  { updatedAt: "desc" },
  { title: "asc" },
  { id: "asc" },
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
  limit: number = DASHBOARD_RECENT_ITEMS_LIMIT,
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
 * The user's items for the search palette, newest first: the card fields it
 * matches on, never bodies. Loaded with the user session, so search costs no
 * request per keystroke; capped so a large library keeps the page load small,
 * at the cost of not finding the oldest items past the cap.
 */
export const getSearchItems = async (): Promise<ItemSummary[]> => {
  const userId = await requireCurrentUserId();
  const items = await prisma.item.findMany({
    where: { userId },
    orderBy: newestFirst,
    take: SEARCH_ITEM_LIMIT,
    select: itemSummarySelect,
  });
  return items.map(toItemSummary);
};

/**
 * Every favourite item of the signed-in user, newest first, for `/favorites`.
 * Fetched by the page on each visit, not held in the session. Unbounded, like
 * the pinned list: favouriting is a deliberate act.
 */
export const getFavoriteItems = async (): Promise<ItemSummary[]> => {
  const userId = await requireCurrentUserId();
  const items = await prisma.item.findMany({
    where: { userId, isFavorite: true },
    orderBy: newestFirst,
    select: itemSummarySelect,
  });
  return items.map(toItemSummary);
};

/** One page of a user-scoped item listing, newest first, counted with the same filter. */
const itemPage = (where: Prisma.ItemWhereInput, page: number): Promise<Paginated<ItemSummary>> =>
  loadPage(
    page,
    ITEMS_PER_PAGE,
    () => prisma.item.count({ where }),
    async (skip) =>
      (await prisma.item.findMany({ where, orderBy: newestFirst, skip, take: ITEMS_PER_PAGE, select: itemSummarySelect }))
        .map(toItemSummary),
  );

/**
 * One page of one type's items, newest first, for `/items/[type]`: at most
 * `ITEMS_PER_PAGE` rows plus the total, never the whole type. Fetched by the
 * page on each visit; a page past the end comes back empty (`isPastLastPage`).
 */
export const getItemsByType = async (typeId: string, page: number = 1): Promise<Paginated<ItemSummary>> => {
  const userId = await requireCurrentUserId();
  return itemPage({ userId, typeId }, page);
};

/**
 * One page of the items in one of the user's collections, newest first, for
 * `/collections/[slug]`, paged like the type lists. The user scope is on the
 * items, so another user's collection id lists and counts nothing.
 */
export const getCollectionItems = async (collectionId: string, page: number = 1): Promise<Paginated<ItemSummary>> => {
  const userId = await requireCurrentUserId();
  return itemPage({ userId, collections: { some: { collectionId } } }, page);
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
 * Throws `CollectionNotFoundError` unless every id is one of the user's
 * collections. The foreign key only checks that a collection exists, not
 * whose it is, so this runs inside the write's transaction, before it.
 */
const assertOwnCollections = async (tx: Prisma.TransactionClient, userId: string, ids: string[]) => {
  if (ids.length === 0) return;
  const owned = await tx.collection.findMany({ where: { id: { in: ids }, userId }, select: { id: true } });
  // The ids are deduplicated by the schema, so a count tells them apart.
  if (owned.length !== ids.length) throw new CollectionNotFoundError();
};

// One link per collection id; `skipDuplicates` leaves a link that is already
// there as it was, `addedAt` included.
const collectionLinks = (ids: string[]) => ({
  createMany: { data: ids.map((collectionId) => ({ collectionId })), skipDuplicates: true },
});

/**
 * Saves an edit to one of the signed-in user's items and returns it as the
 * drawer shows it. `null` when the item is missing or not theirs: the user
 * scope is part of the write itself, so another user's id changes nothing.
 * An edit that sends tags also deletes the tags it left unused. One that
 * sends collection ids makes them the item's collections, and throws
 * `CollectionNotFoundError`, writing nothing, if one isn't the user's.
 */
export const updateItem = async (
  id: string,
  { tags, collectionIds, ...fields }: ItemUpdate,
): Promise<ItemDetail | null> => {
  const userId = await requireCurrentUserId();
  try {
    const item = await prisma.$transaction(async (tx) => {
      if (collectionIds) await assertOwnCollections(tx, userId, collectionIds);
      const saved = await tx.item.update({
        where: { id, userId },
        data: {
          ...fields,
          // Drop every link, then link the new names.
          tags: tags && { deleteMany: {}, create: tagLinks(userId, tags) },
          // Drop the links not chosen, then add the new ones.
          collections: collectionIds && {
            deleteMany: { collectionId: { notIn: collectionIds } },
            ...collectionLinks(collectionIds),
          },
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
 * named like a built-in, is never used. Throws `CollectionNotFoundError`,
 * saving nothing, if a collection id isn't one of the user's.
 */
export const createItem = async (
  typeName: string,
  { title, description, content, language, url, tags, collectionIds }: ItemCreate,
): Promise<ItemDetail | null> => {
  const userId = await requireCurrentUserId();
  const type = await prisma.itemType.findFirst({
    where: { name: typeName, isSystem: true, userId: null },
    select: { id: true },
  });
  if (!type) return null;

  const item = await prisma.$transaction(async (tx) => {
    if (collectionIds) await assertOwnCollections(tx, userId, collectionIds);
    return tx.item.create({
      data: {
        // Named, not spread: file fields are only ever `setItemFile`'s.
        title,
        description,
        content,
        language,
        url,
        userId,
        typeId: type.id,
        tags: tags && { create: tagLinks(userId, tags) },
        collections: collectionIds && collectionLinks(collectionIds),
      },
      select: itemDetailSelect,
    });
  });
  return toItemDetail(item);
};
