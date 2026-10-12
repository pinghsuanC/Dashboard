import { CollectionDialog } from "@/components/collections/CollectionDialog";
import { ItemCreateDialog } from "@/components/items/ItemCreateDialog";
import { SearchTrigger } from "@/components/search/SearchTrigger";
import { SidebarTrigger } from "@/components/ui/sidebar";

/**
 * The sidebar trigger, the search box (opens the search palette), New
 * Collection and New Item. A grid with equal side columns, so the search box
 * sits at the header's true centre even though the sides differ in width.
 */
export const TopBar = () => {
  return (
    <header className="grid h-16 shrink-0 grid-cols-[1fr_minmax(0,28rem)_1fr] items-center gap-3 border-b px-4">
      <SidebarTrigger className="justify-self-start" />

      <SearchTrigger />

      <div className="flex items-center justify-end gap-2">
        <CollectionDialog />
        <ItemCreateDialog />
      </div>
    </header>
  );
};
