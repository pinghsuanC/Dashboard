import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CollectionList } from "@/components/collections/CollectionList";
import { CollectionGridSkeleton } from "@/components/skeleton/CollectionGridSkeleton";
import { PAGE_PARAM, ROUTES } from "@/lib/constants/routes";
import { getCollectionsPage } from "@/lib/db/collections";
import { isPastLastPage, parsePageParam } from "@/lib/helpers/pagination";

export const metadata: Metadata = {
  title: "Collections",
};

/** The slow part, streamed behind the skeleton: one page of collection cards. */
const CollectionsGrid = async ({ page }: { page: number }) => {
  const collections = await getCollectionsPage(page);
  // A page past the end (a stale link, or its last collection deleted) has nothing to show.
  if (isPastLastPage(collections)) redirect(ROUTES.dashboard);

  return <CollectionList {...collections} />;
};

/**
 * One page of `COLLECTIONS_PER_PAGE` collections from `?page=`, queried on
 * every visit. The user session the `(app)` layout loaded holds every
 * collection too, but only for the sidebar and search: this page never
 * renders them all at once.
 */
const CollectionsPage = async ({ searchParams }: PageProps<"/collections">) => {
  const page = parsePageParam((await searchParams)[PAGE_PARAM]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Collections</h1>
      </header>

      {/* Keyed by page so a page turn shows the skeleton again instead of
          holding the previous page's cards. */}
      <Suspense key={page} fallback={<CollectionGridSkeleton />}>
        <CollectionsGrid page={page} />
      </Suspense>
    </div>
  );
};

export default CollectionsPage;
