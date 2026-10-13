import { cache } from "react";

import { Prisma } from "@/generated/prisma/client";
import { CollectionNameTakenError } from "@/lib/collections/collection-errors";
import { COLLECTIONS_PER_PAGE } from "@/lib/constants/limits";
import { isRecordNotFound, isUniqueViolation } from "@/lib/db/prisma-errors";
import { loadPage } from "@/lib/helpers/pagination";
import { slugify } from "@/lib/helpers/slugify";
import { requireCurrentUserId } from "@/services/auth/session";
import { prisma } from "@/services/prisma";
import type { CollectionCreate, CollectionHeader, CollectionSummary, SessionCollection } from "@/types/collections";
import type { ItemRowType } from "@/types/items";
import type { Paginated } from "@/types/pagination";

/** Distinct types, most frequent first; ties keep first-seen order. */
const rankTypesByUse = (types: ItemRowType[]): ItemRowType[] => {
  const tally = new Map<string, { type: ItemRowType; count: number }>();
  for (const type of types) {
    const entry = tally.get(type.id);
    if (entry) entry.count++;
    else tally.set(type.id, { type, count: 1 });
  }
  // `sort` is stable, so equal counts stay in insertion order.
  return [...tally.values()].sort((a, b) => b.count - a.count).map(({ type }) => type);
};

// What a collection card shows. Pulls one join row per item (just its type)
// and tallies in JS: Prisma's `_count` can't group by a relation's field.
// Move to a raw `GROUP BY` if collections grow to hundreds of items.
const collectionCardSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  isFavorite: true,
  items: {
    select: {
      item: {
        select: { type: { select: { id: true, name: true, label: true, icon: true, color: true } } },
      },
    },
  },
} satisfies Prisma.CollectionSelect;

type CollectionCardRow = Prisma.CollectionGetPayload<{ select: typeof collectionCardSelect }>;

const toCollectionSummary = ({ items, ...collection }: CollectionCardRow): CollectionSummary => ({
  ...collection,
  itemCount: items.length,
  types: rankTypesByUse(items.map(({ item }) => item.type)),
});

// Name, then id, break `updatedAt` ties, so a page never repeats a row.
const newestCollectionFirst = [
  { updatedAt: "desc" },
  { name: "asc" },
  { id: "asc" },
] satisfies Prisma.CollectionOrderByWithRelationInput[];

/**
 * Every collection of the signed-in user, for the user session. Collections
 * are few next to items, so all of them load up front.
 */
export const getSessionCollections = async (): Promise<SessionCollection[]> => {
  const userId = await requireCurrentUserId();
  const collections = await prisma.collection.findMany({
    where: { userId },
    select: { ...collectionCardSelect, updatedAt: true },
  });

  return collections.map(({ updatedAt, ...collection }) => ({ ...toCollectionSummary(collection), updatedAt }));
};

/**
 * One page of the signed-in user's collections as cards, newest first, for
 * `/collections`: at most `COLLECTIONS_PER_PAGE` plus the total. The session
 * holds every collection for the sidebar and search; this page doesn't read
 * it, so a long list never renders all at once. A page past the end comes
 * back empty (`isPastLastPage`).
 */
export const getCollectionsPage = async (page: number = 1): Promise<Paginated<CollectionSummary>> => {
  const userId = await requireCurrentUserId();
  return loadPage(
    page,
    COLLECTIONS_PER_PAGE,
    () => prisma.collection.count({ where: { userId } }),
    async (skip) =>
      (
        await prisma.collection.findMany({
          where: { userId },
          orderBy: newestCollectionFirst,
          skip,
          take: COLLECTIONS_PER_PAGE,
          select: collectionCardSelect,
        })
      ).map(toCollectionSummary),
  );
};

/**
 * Every favourite collection of the signed-in user as cards, newest first,
 * for `/favorites`. Queried per visit; the session copy feeds only the sidebar.
 */
export const getFavoriteCollections = async (): Promise<CollectionSummary[]> => {
  const userId = await requireCurrentUserId();
  const collections = await prisma.collection.findMany({
    where: { userId, isFavorite: true },
    orderBy: newestCollectionFirst,
    select: collectionCardSelect,
  });
  return collections.map(toCollectionSummary);
};

/**
 * Creates a collection for the signed-in user, slugged from its name, in the
 * shape the session holds: a new collection has no items yet. Answers null
 * when the user already has a collection with that slug (`[userId, slug]`
 * is unique), so names differing only in case or punctuation can't both
 * exist. Another user's slugs never clash.
 */
export const createCollection = async (fields: CollectionCreate): Promise<SessionCollection | null> => {
  const userId = await requireCurrentUserId();
  try {
    const collection = await prisma.collection.create({
      data: { ...fields, userId, slug: slugify(fields.name) },
      select: { id: true, name: true, slug: true, description: true, isFavorite: true, updatedAt: true },
    });
    return { ...collection, itemCount: 0, types: [] };
  } catch (error) {
    if (isUniqueViolation(error)) return null;
    throw error;
  }
};

/**
 * One of the signed-in user's collections by slug, for its page header.
 * Looked up on the `[userId, slug]` unique, so another user's slug finds
 * nothing: `null` means missing or not theirs, and callers can't tell which.
 * Request-cached, so the page and its `generateMetadata` share one query.
 */
export const getCollectionBySlug = cache(async (slug: string): Promise<CollectionHeader | null> => {
  const userId = await requireCurrentUserId();
  return prisma.collection.findUnique({
    where: { userId_slug: { userId, slug } },
    select: { id: true, name: true, slug: true, description: true, isFavorite: true },
  });
});

/**
 * Saves the edit dialog's fields on one of the signed-in user's collections,
 * re-slugged from the new name, and returns its new header. `null` when it
 * is missing or not theirs: the user scope is part of the write, so another
 * user's id changes nothing. A slug another of the user's collections has
 * throws `CollectionNameTakenError`; its own slug is no clash. Its items stay.
 */
export const updateCollection = async (id: string, fields: CollectionCreate): Promise<CollectionHeader | null> => {
  const userId = await requireCurrentUserId();
  try {
    return await prisma.collection.update({
      where: { id, userId },
      data: { ...fields, slug: slugify(fields.name) },
      select: { id: true, name: true, slug: true, description: true, isFavorite: true },
    });
  } catch (error) {
    if (isRecordNotFound(error)) return null;
    if (isUniqueViolation(error)) throw new CollectionNameTakenError();
    throw error;
  }
};

/**
 * Deletes one of the signed-in user's collections; `false` when it is
 * missing or not theirs. Only the collection goes: its item links are
 * dropped by the cascade, and the items themselves stay.
 */
export const deleteCollection = async (id: string): Promise<boolean> => {
  const userId = await requireCurrentUserId();
  // `deleteMany`, not `delete`: no match is a count of 0, not a P2025 throw.
  const { count } = await prisma.collection.deleteMany({ where: { id, userId } });
  return count > 0;
};
