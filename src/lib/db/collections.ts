import { prisma } from "@/lib/prisma";

export const RECENT_COLLECTION_LIMIT = 6;

/** The slice of an item type a collection card needs to draw its icons. */
export interface CollectionType {
  id: string;
  label: string;
  icon: string | null;
  color: string;
}

export interface CollectionSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isFavorite: boolean;
  itemCount: number;
  /** Every type in the collection, most-used first: `types[0]` tints the card. */
  types: CollectionType[];
}

export interface CollectionStats {
  collections: number;
  favoriteCollections: number;
}

/**
 * Most recently updated collections, with item counts and types derived from
 * their items.
 *
 * Pulls one row per item (just its type) and tallies in JS: Prisma's `_count`
 * can't group by a relation's field, and a handful of cards makes this cheap.
 * Move to a `groupBy` or raw query if collections grow to hundreds of items.
 */
export async function getRecentCollections(
  userId: string,
  limit: number = RECENT_COLLECTION_LIMIT,
): Promise<CollectionSummary[]> {
  const collections = await prisma.collection.findMany({
    where: { userId },
    // Seeded rows share an `updatedAt` to the millisecond; name keeps the
    // order stable between requests.
    orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
    take: limit,
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      isFavorite: true,
      items: {
        select: {
          item: {
            select: {
              type: {
                select: { id: true, label: true, icon: true, color: true },
              },
            },
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
}

/** Distinct types, most frequent first; ties keep first-seen order. */
function rankTypesByUse(types: CollectionType[]): CollectionType[] {
  const tally = new Map<string, { type: CollectionType; count: number }>();
  for (const type of types) {
    const entry = tally.get(type.id);
    if (entry) entry.count++;
    else tally.set(type.id, { type, count: 1 });
  }
  // `sort` is stable, so equal counts stay in insertion order.
  return [...tally.values()]
    .sort((a, b) => b.count - a.count)
    .map(({ type }) => type);
}

export async function getCollectionStats(
  userId: string,
): Promise<CollectionStats> {
  const [collections, favoriteCollections] = await Promise.all([
    prisma.collection.count({ where: { userId } }),
    prisma.collection.count({ where: { userId, isFavorite: true } }),
  ]);
  return { collections, favoriteCollections };
}
