import type { CSSProperties } from "react";
import Link from "next/link";
import { Star } from "lucide-react";

import { TypeIcon } from "@/components/shared/TypeIcon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CollectionSummary } from "@/lib/db/collections";
import { collectionHref } from "@/lib/routes";

interface CollectionCardProps {
  collection: CollectionSummary;
}

export const CollectionCard = ({ collection }: CollectionCardProps) => {
  const { types } = collection;

  // Types arrive most-used first, so the first one tints the card edge. An
  // empty collection has no types and keeps the plain border.
  const accent = types[0]?.color ?? "var(--border)";

  return (
    <Link href={collectionHref(collection.slug)} className="group block">
      <Card
        className="hover:bg-muted/40 h-full border-l-4 border-l-(--type-color) transition-colors"
        style={{ "--type-color": accent } as CSSProperties}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="truncate group-hover:underline">
              {collection.name}
            </span>
            {collection.isFavorite && (
              <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />
            )}
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            {collection.itemCount}{" "}
            {collection.itemCount === 1 ? "item" : "items"}
          </p>
        </CardHeader>

        <CardContent className="flex flex-col gap-3">
          {collection.description && (
            <p className="text-muted-foreground line-clamp-2">
              {collection.description}
            </p>
          )}

          <div className="flex items-center gap-2">
            {types.map((type) => (
              <TypeIcon key={type.id} type={type} className="size-4" />
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};
