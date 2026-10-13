import Link from "next/link";
import { Star } from "lucide-react";

import { CollectionDialog } from "@/components/collections/CollectionDialog";
import { ItemCreateDialog } from "@/components/items/ItemCreateDialog";
import { SearchTrigger } from "@/components/search/SearchTrigger";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ROUTES } from "@/lib/constants/routes";

/**
 * The sidebar trigger, the search box (opens the search palette), a link to
 * Favorites, New Collection and New Item. A grid with equal side columns, so the search box
 * sits at the header's true centre even though the sides differ in width.
 */
export const TopBar = () => {
  return (
    <header className="grid h-16 shrink-0 grid-cols-[1fr_minmax(0,28rem)_1fr] items-center gap-3 border-b px-4">
      <SidebarTrigger className="justify-self-start" />

      <SearchTrigger />

      <div className="flex items-center justify-end gap-2">
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
