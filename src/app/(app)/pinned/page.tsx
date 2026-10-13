import type { Metadata } from "next";

import { PinnedList } from "@/components/pinned/PinnedList";

export const metadata: Metadata = {
  title: "Pinned",
};

/** Every pinned item, from the user session the `(app)` layout loaded. */
const PinnedPage = () => (
  <div className="mx-auto flex max-w-4xl flex-col gap-6">
    <header>
      <h1 className="font-heading text-3xl font-semibold tracking-tight">Pinned</h1>
    </header>

    <PinnedList />
  </div>
);

export default PinnedPage;
