import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { File as FileIcon, Image as ImageIcon, LayoutGrid, Star } from "lucide-react";

import { CollectionDeleteDialog } from "@/components/collections/CollectionDeleteDialog";
import { CollectionDialog } from "@/components/collections/CollectionDialog";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { FileListHeader, FileRow } from "@/components/items/FileRow";
import { ImageCard } from "@/components/items/ImageCard";
import { ItemRow } from "@/components/items/ItemRow";
import { ItemGridSkeleton } from "@/components/skeleton/ItemGridSkeleton";
import { isGalleryItemType, isListItemType } from "@/lib/constants/item-types";
import { COLLECTION_NAME_MAX_LENGTH } from "@/lib/constants/limits";
import { getCollectionBySlug } from "@/lib/db/collections";
import { getCollectionItems } from "@/lib/db/items";
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
 */
const CollectionItems = async ({ collectionId }: { collectionId: string }) => {
  const items = await getCollectionItems(collectionId);

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
          <SectionHeader title={`Items (${cards.length})`} icon={LayoutGrid} size="sm" />
          <div className="grid gap-3 md:grid-cols-2">
            {cards.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}
      {files.length > 0 && (
        <section>
          <SectionHeader title={`Files (${files.length})`} icon={FileIcon} size="sm" />
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
          <SectionHeader title={`Images (${images.length})`} icon={ImageIcon} size="sm" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((item) => (
              <ImageCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

/**
 * The header comes from one small, request-cached lookup shared with
 * `generateMetadata`; the items are queried on every visit and stream in.
 * A missing slug and another user's slug are both answered as not found.
 */
const CollectionPage = async ({ params }: PageProps<"/collections/[slug]">) => {
  const collection = await resolveCollection(params);
  if (!collection) notFound();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header className="flex items-start gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="font-heading flex items-center gap-2 text-3xl font-semibold tracking-tight">
            <span className="min-w-0 truncate">{collection.name}</span>
            {collection.isFavorite && <Star className="size-5 shrink-0 fill-amber-400 text-amber-400" />}
          </h1>
          {collection.description && <p className="text-muted-foreground">{collection.description}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <CollectionDialog collection={collection} />
          <CollectionDeleteDialog collectionId={collection.id} name={collection.name} />
        </div>
      </header>

      {/* Keyed by collection so moving between collections shows the skeleton
          again instead of holding the previous collection's items. */}
      <Suspense key={collection.id} fallback={<ItemGridSkeleton />}>
        <CollectionItems collectionId={collection.id} />
      </Suspense>
    </div>
  );
};

export default CollectionPage;
