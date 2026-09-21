import { FolderPlus, PanelLeft, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Display only — nothing here is wired up yet. */
export function TopBar() {
  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b px-4">
      <Button variant="ghost" size="icon" aria-label="Toggle sidebar">
        <PanelLeft />
      </Button>

      <div className="relative w-full max-w-md">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          type="search"
          placeholder="Search items..."
          className="pr-16 pl-9"
          aria-label="Search items"
        />
        <kbd className="bg-muted text-muted-foreground pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded border px-1.5 py-0.5 font-sans text-xs sm:block">
          ⌘K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="outline" className="hidden sm:inline-flex">
          <FolderPlus />
          New Collection
        </Button>
        <Button>
          <Plus />
          New Item
        </Button>
      </div>
    </header>
  );
}
