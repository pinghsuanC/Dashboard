import type { CSSProperties } from "react";
import Link from "next/link";
import { Star } from "lucide-react";

import { TypeIcon } from "@/components/shared/TypeIcon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Collection, ItemType } from "@/lib/mock-data";

interface CollectionCardProps {
  collection: Collection;
  typesById: Map<string, ItemType>;
}

export const CollectionCard = ({
  collection,
  typesById,
}: CollectionCardProps) => {
  // `itemTypeIds` is raw data and may name a type that no longer exists, so
  // resolve first and drop the misses rather than rendering an undefined icon.
  const types = collection.itemTypeIds
    .map((id) => typesById.get(id))
    .filter((type): type is ItemType => type !== undefined);

  // The first type tints the card edge, as in the reference screenshot.
  const accent = types[0]?.color ?? "var(--border)";

  return (
    <Link href={`/collections/${collection.slug}`} className="group block">
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
            {collection.itemCount} items
          </p>
        </CardHeader>

        <CardContent className="flex flex-col gap-3">
          <p className="text-muted-foreground line-clamp-2">
            {collection.description}
          </p>

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
