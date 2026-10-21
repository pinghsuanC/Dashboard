"use client";

import { Search } from "lucide-react";
import { useSyncExternalStore } from "react";

import { useSearchPalette } from "@/components/search/SearchPaletteProvider";
import { Button } from "@/components/ui/button";
import { searchShortcutLabel } from "@/lib/search/search";

const subscribe = () => () => {};

/**
 * The top bar's search box: a button styled as an input that opens the search
 * palette. The shortcut hint depends on the platform, which the server can't
 * know, so it renders only in the browser instead of flipping after hydration.
 */
export const SearchTrigger = () => {
  const { openSearch } = useSearchPalette();
  const shortcut = useSyncExternalStore(
    subscribe,
    () => searchShortcutLabel(navigator.platform),
    () => null,
  );

  return (
    <button
      type="button"
      onClick={openSearch}
      aria-keyshortcuts="Meta+K Control+K"
      className="border-input text-muted-foreground hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 relative flex h-9 w-full max-w-md min-w-0 items-center gap-2 rounded-md border bg-transparent pr-3 pl-3 sm:pr-16 text-left text-sm shadow-xs transition-colors outline-none focus-visible:ring-3"
    >
      <Search className="size-4 shrink-0" aria-hidden />
      <span className="truncate">Search items and collections…</span>
      {shortcut && (
        <kbd className="bg-muted absolute top-1/2 right-3 hidden -translate-y-1/2 rounded border px-1.5 py-0.5 font-sans text-xs sm:block">
          {shortcut}
        </kbd>
      )}
    </button>
  );
};

/**
 * The phone and tablet version of the search box: an icon button in the top bar's actions,
 * since the box is hidden below `lg` and a touch screen has no Cmd+K.
 */
export const SearchIconTrigger = () => {
  const { openSearch } = useSearchPalette();

  return (
    <Button type="button" variant="ghost" size="icon" onClick={openSearch} aria-label="Search">
      <Search />
    </Button>
  );
};
