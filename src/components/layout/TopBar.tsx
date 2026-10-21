import Link from "next/link";
import { Star } from "lucide-react";

import { CollectionDialog } from "@/components/collections/CollectionDialog";
import { ItemCreateDialog } from "@/components/items/ItemCreateDialog";
import { SearchIconTrigger, SearchTrigger } from "@/components/search/SearchTrigger";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ROUTES } from "@/lib/constants/routes";

/**
 * The sidebar trigger, the search box (opens the search palette), a link to
 * Favorites, New Collection and New Item. Sticky, so it stays in reach while the
 * page scrolls; z-40 keeps it over the page but under dialogs, sheets and popovers (z-50).
 * From `lg` (where the sidebar stops being a sheet) it is a grid with equal side
 * columns, so the search box sits at the header's true centre; below it the search
 * box gives way to a search icon among the actions, and the trigger and actions sit
 * at either end.
 */
export const TopBar = () => {
  return (
    <header className="bg-background sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-3 border-b px-4 lg:grid lg:grid-cols-[1fr_minmax(0,28rem)_1fr]">
      <SidebarTrigger className="justify-self-start" />

      <div className="hidden min-w-0 lg:block">
        <SearchTrigger />
      </div>

      <div className="flex items-center justify-end gap-2">
        <div className="lg:hidden">
          <SearchIconTrigger />
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button asChild variant="ghost" size="icon">
              <Link href={ROUTES.favorites} aria-label="Favorites">
                <Star />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Favorites</TooltipContent>
        </Tooltip>
        <CollectionDialog />
        <ItemCreateDialog />
      </div>
    </header>
  );
};
