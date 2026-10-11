"use client";

import { useMemo } from "react";

import { CollectionCard } from "@/components/collections/CollectionCard";
import { useUserSession } from "@/components/session/UserSessionProvider";
import { selectRecentCollections } from "@/lib/session/session-selectors";

/**
 * Every collection, newest first, from the user session: all of them are
 * already loaded there, so the page needs no query and a new collection shows
 * up as soon as the session has it.
 */
export const CollectionList = () => {
  const { collections } = useUserSession();
  const cards = useMemo(() => selectRecentCollections(collections, collections.length), [collections]);

  if (cards.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center">
        No collections yet.
      </p>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <p className="text-muted-foreground">
        {cards.length} {cards.length === 1 ? "collection" : "collections"}
      </p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((collection) => (
          <CollectionCard key={collection.id} collection={collection} />
        ))}
      </div>
    </section>
  );
};
