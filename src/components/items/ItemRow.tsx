import type { CSSProperties } from "react";
import { Pin, Star } from "lucide-react";

import { TypeIcon } from "@/components/shared/TypeIcon";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatShortDate } from "@/lib/format";
import type { ItemSummary } from "@/lib/db/items";

interface ItemRowProps {
  item: ItemSummary;
}

/**
 * KNOWN DEVIATION: the row is not a link. The reference opens an item drawer on
 * click and no `/items/[id]` route exists yet, so linking here would only
 * produce 404s. Wire it up with the item detail view.
 */
export const ItemRow = ({ item }: ItemRowProps) => {
  // The type is a required relation (deletes are Restricted), so every row has
  // one. Set once on the card so the left edge and the icon tint stay in step.
  const { type } = item;

  return (
    <Card
      size="sm"
      className="border-l-4 border-l-(--type-color)"
      style={{ "--type-color": type.color } as CSSProperties}
    >
      <CardContent className="flex items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-(--type-color)/10">
          <TypeIcon type={type} className="size-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-medium">{item.title}</h3>
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

          <p className="text-muted-foreground mt-1 line-clamp-2">
            {item.description}
          </p>

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
