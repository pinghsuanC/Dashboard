import { requireCurrentUserId } from "@/services/auth/session";
import { prisma } from "@/services/prisma";
import type { SessionCollection } from "@/types/collections";
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
