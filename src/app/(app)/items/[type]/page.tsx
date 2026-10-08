import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ImageCard } from "@/components/items/ImageCard";
import { ItemRow } from "@/components/items/ItemRow";
import { TypeIcon } from "@/components/shared/TypeIcon";
import { ImageGridSkeleton } from "@/components/skeleton/ImageGridSkeleton";
import { ItemGridSkeleton } from "@/components/skeleton/ItemGridSkeleton";
import { isGalleryItemType } from "@/lib/constants/item-types";
import { itemTypeNameFromSegment } from "@/lib/constants/routes";
import { getSystemItemTypeByName } from "@/lib/db/item-types";
import { getItemsByType } from "@/lib/db/items";
import type { ItemTypeDefinition } from "@/types/items";

/** The type the URL names, or null for a segment no type route produces. */
const resolveType = async (params: PageProps<"/items/[type]">["params"]) => {
  const name = itemTypeNameFromSegment((await params).type);
  return name ? getSystemItemTypeByName(name) : null;
};

export const generateMetadata = async ({
  params,
}: PageProps<"/items/[type]">): Promise<Metadata> => {
  const type = await resolveType(params);
  return type ? { title: type.label } : {};
};

interface ItemTypeItemsProps {
  type: ItemTypeDefinition;
  /** Image tiles in three columns instead of item cards in two. */
  gallery: boolean;
}

/**
 * The slow part, streamed: the page sends its header first and this replaces
 * the skeleton when the query returns. The count lives here, not in the
 * header, because it comes from the same query.
 */
const ItemTypeItems = async ({ type, gallery }: ItemTypeItemsProps) => {
  const items = await getItemsByType(type.id);

  if (items.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center">
        No {type.label.toLowerCase()} yet.
      </p>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <p className="text-muted-foreground">
        {items.length} {items.length === 1 ? "item" : "items"}
      </p>
      {gallery ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <ImageCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((item) => (
            <ItemRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
};

/**
 * The items are queried on every visit, like the dashboard's recent items,
 * and are not kept in the user session. Only the type lookup (one small,
 * request-cached row shared with `generateMetadata`) runs before the header
 * renders; the item query streams in behind a skeleton of the same shape.
 * `ItemRow` is already a card with the type-coloured left edge, so the grid
 * reuses it; gallery types (images) show `ImageCard` thumbnails instead.
 */
const ItemTypePage = async ({ params }: PageProps<"/items/[type]">) => {
  const type = await resolveType(params);
  if (!type) notFound();
  const gallery = isGalleryItemType(type.name);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header className="flex items-center gap-3">
        <TypeIcon type={type} className="size-7" />
        <h1 className="font-heading text-3xl font-semibold tracking-tight">{type.label}</h1>
      </header>

      {/* Keyed by type so moving between type pages shows the skeleton again
          instead of holding the previous type's items. */}
      <Suspense key={type.id} fallback={gallery ? <ImageGridSkeleton /> : <ItemGridSkeleton />}>
        <ItemTypeItems type={type} gallery={gallery} />
      </Suspense>
    </div>
  );
};

export default ItemTypePage;
