import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { File as FileIcon, Image as ImageIcon, LayoutGrid } from "lucide-react";

import { CollectionDeleteDialog } from "@/components/collections/CollectionDeleteDialog";
import { CollectionDialog } from "@/components/collections/CollectionDialog";
import { CollectionFavoriteButton } from "@/components/collections/CollectionFavoriteButton";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { FileListHeader, FileRow } from "@/components/items/FileRow";
import { ImageCard } from "@/components/items/ImageCard";
import { ItemRow } from "@/components/items/ItemRow";
import { Pagination } from "@/components/shared/Pagination";
import { ItemGridSkeleton } from "@/components/skeleton/ItemGridSkeleton";
import { isGalleryItemType, isListItemType } from "@/lib/constants/item-types";
import { COLLECTION_NAME_MAX_LENGTH } from "@/lib/constants/limits";
import { collectionHref, PAGE_PARAM, ROUTES } from "@/lib/constants/routes";
import { getCollectionBySlug } from "@/lib/db/collections";
import { getCollectionItems } from "@/lib/db/items";
import { isPastLastPage, parsePageParam } from "@/lib/helpers/pagination";
import { isSlug } from "@/lib/helpers/slugify";

/**
 * The collection the URL names, or null. A segment `slugify` could never have
 * produced (wrong characters, too long) is turned away before any query.
 */
const resolveCollection = async (params: PageProps<"/collections/[slug]">["params"]) => {
  const { slug } = await params;
  return isSlug(slug, COLLECTION_NAME_MAX_LENGTH) ? getCollectionBySlug(slug) : null;
};

export const generateMetadata = async ({
  params,
}: PageProps<"/collections/[slug]">): Promise<Metadata> => {
  const collection = await resolveCollection(params);
  return collection ? { title: collection.name } : {};
};

/**
 * The slow part, streamed behind the skeleton. A collection mixes types, so
 * each kind gets its own headed section in the layout its type page uses:
 * Items as cards in two columns, then Files as rows, then Images as tiles. A
 * section with nothing in it is left out.
 *
 * One page of `ITEMS_PER_PAGE`, newest first, is split into the sections, so
 * a page's mix of types varies and a section shows only its part of the
 * page. That is why the headers carry no count: it would be this page's, not
 * the section's. Paging each section on its own is in README Future Plans.
 */
const CollectionItems = async ({ collectionId, slug, page }: { collectionId: string; slug: string; page: number }) => {
  const { rows: items, pageCount } = await getCollectionItems(collectionId, page);
  // A page past the end (a stale link, or the last item on it deleted) has nothing to show.
  if (isPastLastPage({ page, pageCount })) redirect(ROUTES.dashboard);

  if (items.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center">
        No items in this collection yet.
      </p>
    );
  }

  const images = items.filter((item) => isGalleryItemType(item.type.name));
  const files = items.filter((item) => isListItemType(item.type.name));
  const cards = items.filter((item) => !isGalleryItemType(item.type.name) && !isListItemType(item.type.name));

  return (
    <div className="flex flex-col gap-8">
      {cards.length > 0 && (
        <section>
          <SectionHeader title="Items" icon={LayoutGrid} size="sm" />
          <div className="grid gap-3 md:grid-cols-2">
            {cards.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}
      {files.length > 0 && (
        <section>
          <SectionHeader title="Files" icon={FileIcon} size="sm" />
          <div className="overflow-hidden rounded-lg border">
            <FileListHeader />
            <ul className="divide-y">
              {files.map((item) => (
                <FileRow key={item.id} item={item} />
              ))}
            </ul>
          </div>
        </section>
      )}
      {images.length > 0 && (
        <section>
          <SectionHeader title="Images" icon={ImageIcon} size="sm" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((item) => (
              <ImageCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}
      <Pagination path={collectionHref(slug)} page={page} pageCount={pageCount} />
    </div>
  );
};

/**
 * The header comes from one small, request-cached lookup shared with
 * `generateMetadata`; the items are queried on every visit and stream in.
 * A missing slug and another user's slug are both answered as not found.
 */
const CollectionPage = async ({ params, searchParams }: PageProps<"/collections/[slug]">) => {
  const collection = await resolveCollection(params);
  if (!collection) notFound();
  const page = parsePageParam((await searchParams)[PAGE_PARAM]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      {/* On phones the actions drop below the name, which wraps: beside it they
          left the name about 175px and cut it off. */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="font-heading text-3xl font-semibold tracking-tight break-words sm:truncate">
            {collection.name}
          </h1>
          {collection.description && <p className="text-muted-foreground">{collection.description}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <CollectionFavoriteButton collectionId={collection.id} isFavorite={collection.isFavorite} />
          <CollectionDialog collection={collection} />
          <CollectionDeleteDialog collectionId={collection.id} name={collection.name} />
        </div>
      </header>

      {/* Keyed by collection and page so moving to another collection or page
          shows the skeleton again instead of holding the previous one's items. */}
      <Suspense key={`${collection.id}-${page}`} fallback={<ItemGridSkeleton />}>
        <CollectionItems collectionId={collection.id} slug={collection.slug} page={page} />
      </Suspense>
    </div>
  );
};

export default CollectionPage;
