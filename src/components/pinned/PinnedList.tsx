"use client";

import { useMemo } from "react";
import { Pin } from "lucide-react";

import { FavoriteItemRow } from "@/components/favorites/FavoriteItemRow";
import { useUserSession } from "@/components/session/UserSessionProvider";
import { selectPinnedItems } from "@/lib/session/session-selectors";

/**
 * Every pinned item as one dense list, in the `/favorites` row style, which
 * opens the item drawer. Read from the user session, which holds them all
 * (unbounded) and is re-sent after a pin or unpin, so nothing is queried.
 */
export const PinnedList = () => {
  const { pinnedItems: sessionPinned } = useUserSession();
  const items = useMemo(() => selectPinnedItems(sessionPinned), [sessionPinned]);

  if (items.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-col items-center gap-2 py-16 text-center">
        <Pin className="size-8" aria-hidden />
        <p className="text-foreground font-medium">No pinned items yet</p>
        <p className="text-sm">Pin an item from its details and it shows up here.</p>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-1 font-mono text-sm" aria-label="Pinned items">
      <h2 className="text-muted-foreground border-b px-2 pb-1 text-xs font-medium tracking-wider uppercase">
        Items <span className="tabular-nums">({items.length})</span>
      </h2>
      <ul className="divide-border/50 divide-y">
        {items.map((item) => (
          <FavoriteItemRow key={item.id} item={item} />
        ))}
      </ul>
    </section>
  );
};
