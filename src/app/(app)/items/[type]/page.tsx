import { Suspense, type ReactNode } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { FileListHeader, FileRow } from "@/components/items/FileRow";
import { ImageCard } from "@/components/items/ImageCard";
import { ItemRow } from "@/components/items/ItemRow";
import { Pagination } from "@/components/shared/Pagination";
import { TypeIcon } from "@/components/shared/TypeIcon";
import { FileListSkeleton } from "@/components/skeleton/FileListSkeleton";
import { ImageGridSkeleton } from "@/components/skeleton/ImageGridSkeleton";
import { ItemGridSkeleton } from "@/components/skeleton/ItemGridSkeleton";
import { isGalleryItemType, isListItemType } from "@/lib/constants/item-types";
import { itemTypeHref, itemTypeNameFromSegment, PAGE_PARAM, ROUTES } from "@/lib/constants/routes";
import { getSystemItemTypeByName } from "@/lib/db/item-types";
import { getItemsByType } from "@/lib/db/items";
import { isPastLastPage, parsePageParam } from "@/lib/helpers/pagination";
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

/**
 * How a type's items are laid out: image tiles in three columns, file rows
 * in one, or item cards in two.
 */
type ItemLayout = "gallery" | "list" | "cards";

const itemLayoutFor = (typeName: string): ItemLayout =>
  isGalleryItemType(typeName) ? "gallery" : isListItemType(typeName) ? "list" : "cards";

const SKELETONS: Record<ItemLayout, ReactNode> = {
  gallery: <ImageGridSkeleton />,
  list: <FileListSkeleton />,
  cards: <ItemGridSkeleton />,
};

interface ItemTypeItemsProps {
  type: ItemTypeDefinition;
  layout: ItemLayout;
  page: number;
}

/**
 * The slow part, streamed: the page sends its header first and this replaces
 * the skeleton when the query returns. The count lives here, not in the
 * header, because it comes from the same query: the total across every page.
 */
const ItemTypeItems = async ({ type, layout, page }: ItemTypeItemsProps) => {
  const { rows: items, total, ...pages } = await getItemsByType(type.id, page);
  // A page past the end (a stale link, or the last item on it deleted) has nothing to show.
  if (isPastLastPage(pages)) redirect(ROUTES.dashboard);

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
        {total} {total === 1 ? "item" : "items"}
      </p>
      {layout === "gallery" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <ImageCard key={item.id} item={item} />
          ))}
        </div>
      ) : layout === "list" ? (
        <div className="overflow-hidden rounded-lg border">
          <FileListHeader />
          <ul className="divide-y">
            {items.map((item) => (
              <FileRow key={item.id} item={item} />
            ))}
          </ul>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((item) => (
            <ItemRow key={item.id} item={item} />
          ))}
        </div>
      )}
      <Pagination path={itemTypeHref(type.name)} {...pages} />
    </section>
  );
};

/**
 * The items are queried on every visit, like the dashboard's recent items,
 * and are not kept in the user session. Only the type lookup (one small,
 * request-cached row shared with `generateMetadata`) runs before the header
 * renders; the item query streams in behind a skeleton of the same shape.
 * `ItemRow` is already a card with the type-coloured left edge, so the grid
 * reuses it; gallery types (images) show `ImageCard` thumbnails instead, and
 * list types (files) a single column of `FileRow`s. One page of
 * `ITEMS_PER_PAGE` at a time, from `?page=`.
 */
const ItemTypePage = async ({ params, searchParams }: PageProps<"/items/[type]">) => {
  const type = await resolveType(params);
  if (!type) notFound();
  const layout = itemLayoutFor(type.name);
  const page = parsePageParam((await searchParams)[PAGE_PARAM]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header className="flex items-center gap-3">
        <TypeIcon type={type} className="size-7" />
        <h1 className="font-heading text-3xl font-semibold tracking-tight">{type.label}</h1>
      </header>

      {/* Keyed by type and page so moving to another type or page shows the
          skeleton again instead of holding the previous one's items. */}
      <Suspense key={`${type.id}-${page}`} fallback={SKELETONS[layout]}>
        <ItemTypeItems type={type} layout={layout} page={page} />
      </Suspense>
    </div>
  );
};

export default ItemTypePage;
