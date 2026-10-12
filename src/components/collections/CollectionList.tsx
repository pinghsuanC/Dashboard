import { CollectionCard } from "@/components/collections/CollectionCard";
import { Pagination } from "@/components/shared/Pagination";
import { ROUTES } from "@/lib/constants/routes";
import type { CollectionSummary } from "@/types/collections";
import type { Paginated } from "@/types/pagination";

/**
 * One page of collection cards, newest first, with the total across every
 * page and the page links. Server-rendered from `getCollectionsPage()`, not
 * the user session: the session holds every collection, and this page only
 * ever shows one page of them. A new or edited collection shows up when the
 * save refreshes the route.
 */
export const CollectionList = ({ rows: cards, total, page, pageCount }: Paginated<CollectionSummary>) => {
  if (cards.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center">
        No collections yet.
      </p>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <p className="text-muted-foreground">
        {total} {total === 1 ? "collection" : "collections"}
      </p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((collection) => (
          <CollectionCard key={collection.id} collection={collection} />
        ))}
      </div>
      <Pagination path={ROUTES.collections} page={page} pageCount={pageCount} />
    </section>
  );
};
