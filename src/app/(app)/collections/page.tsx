import type { Metadata } from "next";

import { CollectionList } from "@/components/collections/CollectionList";

export const metadata: Metadata = {
  title: "Collections",
};

/** No query here: the collections come from the user session the `(app)` layout loaded. */
const CollectionsPage = () => (
  <div className="mx-auto flex max-w-6xl flex-col gap-6">
    <header>
      <h1 className="font-heading text-3xl font-semibold tracking-tight">Collections</h1>
    </header>

    <CollectionList />
  </div>
);

export default CollectionsPage;
