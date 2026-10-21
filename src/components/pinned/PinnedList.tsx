"use client";

import { useMemo } from "react";
import { Pin } from "lucide-react";

import { ItemRow } from "@/components/items/ItemRow";
import { useUserSession } from "@/components/session/UserSessionProvider";
import { selectPinnedItems } from "@/lib/session/session-selectors";

/**
 * Every pinned item as item cards in the item type pages' grid; a card opens
 * the item drawer. Read from the user session, which holds them all
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
    <section className="flex flex-col gap-3" aria-label="Pinned items">
      <p className="text-muted-foreground">
        {items.length} {items.length === 1 ? "item" : "items"}
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <ItemRow key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
};
