"use client";

import type { CSSProperties } from "react";

import { useItemDrawer } from "@/components/items/ItemDrawerProvider";
import { TypeIcon } from "@/components/shared/TypeIcon";
import type { ItemSummary } from "@/types/items";

interface FavoriteItemRowProps {
  item: ItemSummary;
}

/**
 * One favourite item as a dense list row: type icon, title, type badge.
 * Like `ItemRow`, the title is a button whose `::after` covers the row and
 * opens the item drawer.
 */
export const FavoriteItemRow = ({ item }: FavoriteItemRowProps) => {
  const { openItem } = useItemDrawer();
  const { type } = item;

  return (
    <li
      className="hover:bg-muted/40 has-focus-visible:ring-ring/50 relative flex items-center gap-3 px-2 py-1.5 transition-colors has-focus-visible:ring-2 has-focus-visible:ring-inset"
      style={{ "--type-color": type.color } as CSSProperties}
    >
      <TypeIcon type={type} className="size-4 shrink-0" />
      <button
        type="button"
        onClick={() => openItem(item)}
        className="min-w-0 flex-1 truncate text-left outline-none after:absolute after:inset-0 after:content-['']"
      >
        {item.title}
      </button>
      <span className="shrink-0 rounded-sm bg-(--type-color)/10 px-1.5 py-0.5 text-xs text-(--type-color)">
        {type.name}
      </span>
    </li>
  );
};
