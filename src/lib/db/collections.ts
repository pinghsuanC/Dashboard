import { cache } from "react";

import { Prisma } from "@/generated/prisma/client";
import { slugify } from "@/lib/helpers/slugify";
import { requireCurrentUserId } from "@/services/auth/session";
import { prisma } from "@/services/prisma";
import type { CollectionCreate, CollectionHeader, SessionCollection } from "@/types/collections";
import type { ItemRowType } from "@/types/items";

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

/**
 * Every collection of the signed-in user, for the user session. Collections
 * are few next to items, so all of them load up front.
 *
 * Pulls one join row per item (just its type) and tallies in JS: Prisma's
 * `_count` can't group by a relation's field. Move to a raw `GROUP BY` if
 * collections grow to hundreds of items.
 */
export const getSessionCollections = async (): Promise<SessionCollection[]> => {
  const userId = await requireCurrentUserId();
  const collections = await prisma.collection.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      isFavorite: true,
      updatedAt: true,
      items: {
        select: {
          item: {
            select: { type: { select: { id: true, name: true, label: true, icon: true, color: true } } },
          },
        },
      },
    },
  });

  return collections.map(({ items, ...collection }) => ({
    ...collection,
    itemCount: items.length,
    types: rankTypesByUse(items.map(({ item }) => item.type)),
  }));
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

// Prisma's answer when a write breaks a unique index.
const isUniqueViolation = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
