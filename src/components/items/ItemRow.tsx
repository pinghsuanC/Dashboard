"use client";

import type { CSSProperties } from "react";
import { Pin, Star } from "lucide-react";

import { useItemDrawer } from "@/components/items/ItemDrawerProvider";
import { TypeIcon } from "@/components/shared/TypeIcon";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { ItemSummary } from "@/lib/db/items";
import { formatShortDate } from "@/lib/helpers/format";

interface ItemRowProps {
  item: ItemSummary;
}

/**
 * An item card. Clicking anywhere on it opens the item drawer: the title is a
 * button whose `::after` covers the card, since a real `<button>` around the
 * whole card couldn't hold its heading and blocks.
 */
export const ItemRow = ({ item }: ItemRowProps) => {
  const { openItem } = useItemDrawer();
  // The type is a required relation (deletes are Restricted), so every row has
  // one. Set once on the card so the left edge and the icon tint stay in step.
  const { type } = item;

  return (
    <Card
      size="sm"
      className="hover:bg-muted/40 has-focus-visible:ring-ring/50 relative border-l-4 border-l-(--type-color) transition-colors has-focus-visible:ring-3"
      style={{ "--type-color": type.color } as CSSProperties}
    >
      <CardContent className="flex items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-(--type-color)/10">
          <TypeIcon type={type} className="size-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="min-w-0 font-medium">
              <button
                type="button"
                onClick={() => openItem(item)}
                className="block max-w-full truncate text-left outline-none after:absolute after:inset-0 after:content-['']"
              >
                {item.title}
              </button>
            </h3>
            {item.isPinned && (
              <Pin className="text-muted-foreground size-3.5 shrink-0" />
            )}
            {item.isFavorite && (
              <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />
            )}
            <time
              dateTime={item.updatedAt.toISOString()}
              className="text-muted-foreground ml-auto shrink-0 text-xs"
            >
              {formatShortDate(item.updatedAt)}
            </time>
          </div>

          {item.description && (
            <p className="text-muted-foreground mt-1 line-clamp-2">
              {item.description}
            </p>
          )}

          {item.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {item.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
