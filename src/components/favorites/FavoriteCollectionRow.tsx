import type { CSSProperties } from "react";
import Link from "next/link";
import { Folder } from "lucide-react";

import { collectionHref } from "@/lib/constants/routes";
import type { CollectionSummary } from "@/types/collections";

interface FavoriteCollectionRowProps {
  collection: CollectionSummary;
}

/**
 * One favourite collection as a dense list row: a folder tinted with its
 * most-used type (plain for an empty one), name, a `collection` badge and its
 * item count. The whole row links to the collection's page.
 */
export const FavoriteCollectionRow = ({ collection }: FavoriteCollectionRowProps) => (
  <li>
    <Link
      href={collectionHref(collection.slug)}
      className="hover:bg-muted/40 focus-visible:ring-ring/50 flex items-center gap-3 px-2 py-1.5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset"
      style={{ "--type-color": collection.types[0]?.color ?? "var(--muted-foreground)" } as CSSProperties}
    >
      <Folder className="size-4 shrink-0 text-(--type-color)" aria-hidden />
      <span className="min-w-0 flex-1 truncate">{collection.name}</span>
      <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
        {collection.itemCount} {collection.itemCount === 1 ? "item" : "items"}
      </span>
      <span className="bg-muted text-muted-foreground shrink-0 rounded-sm px-1.5 py-0.5 text-xs">collection</span>
    </Link>
  </li>
);
