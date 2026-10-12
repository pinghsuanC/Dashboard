"use client";

import { Folder } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { useItemDrawer } from "@/components/items/ItemDrawerProvider";
import { useUserSession } from "@/components/session/UserSessionProvider";
import { TypeIcon } from "@/components/shared/TypeIcon";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { collectionHref } from "@/lib/constants/routes";
import {
  collectionSearchKeywords,
  itemSearchKeywords,
  ownsSearchShortcut,
  searchScore,
  searchShortcutAction,
} from "@/lib/search/search";

interface SearchPaletteContextValue {
  openSearch: () => void;
}

const SearchPaletteContext = createContext<SearchPaletteContextValue | null>(null);

// Rows are keyed by id (cmdk needs a unique `value`) and matched on their
// keywords alone, so a uuid fragment matches nothing.
const byKeywords = (_value: string, search: string, keywords?: string[]) => searchScore(search, keywords ?? []);

// Any open Radix dialog: the item drawer (a sheet), the New Item and New
// Collection dialogs, confirm dialogs. Read only while the palette is closed,
// so the palette's own dialog never counts.
const isDialogOpen = () =>
  document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]') !== null;

/**
 * The global search palette for every page in the `(app)` layout: Cmd+K or
 * Ctrl+K toggles it, and the top bar's search box opens it through
 * `useSearchPalette()`. It searches the user session's items and collections
 * in the browser, so typing fetches nothing. An item opens in the drawer
 * (hence inside `ItemDrawerProvider`); a collection opens its page.
 */
export const SearchPaletteProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const { openItem } = useItemDrawer();
  const { searchItems, collections } = useUserSession();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Every close clears the search, so the palette always opens empty.
  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) setSearch("");
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!ownsSearchShortcut(event)) return;
      // Ctrl+K is also the browser's own search-bar shortcut: kept from it
      // even when the palette ignores the key below.
      event.preventDefault();
      const action = searchShortcutAction(event, { paletteOpen: open, otherDialogOpen: isDialogOpen() });
      if (action) handleOpenChange(action === "open");
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, handleOpenChange]);

  const openSearch = useCallback(() => setOpen(true), []);
  const value = useMemo(() => ({ openSearch }), [openSearch]);

  const sortedCollections = useMemo(
    () => [...collections].sort((a, b) => a.name.localeCompare(b.name)),
    [collections],
  );

  return (
    <SearchPaletteContext.Provider value={value}>
      {children}
      <CommandDialog
        open={open}
        onOpenChange={handleOpenChange}
        title="Search"
        description="Search your items and collections"
        className="top-[15vh] sm:max-w-2xl"
      >
        <Command filter={byKeywords}>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder="Search items and collections…"
            className="text-base"
          />
          {/* Capped by the viewport too, so the dialog never runs off the screen. */}
          <CommandList className="max-h-[min(28rem,50vh)]">
            <CommandEmpty>No results found.</CommandEmpty>
            {searchItems.length > 0 && (
              <CommandGroup heading="Items">
                {searchItems.map((item) => (
                  <CommandItem
                    className="py-2"
                    key={item.id}
                    value={item.id}
                    keywords={itemSearchKeywords(item)}
                    onSelect={() => {
                      handleOpenChange(false);
                      openItem(item);
                    }}
                  >
                    <TypeIcon type={item.type} />
                    <span className="truncate">{item.title}</span>
                    <CommandShortcut className="tracking-normal">{item.type.label}</CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {sortedCollections.length > 0 && (
              <CommandGroup heading="Collections">
                {sortedCollections.map((collection) => (
                  <CommandItem
                    className="py-2"
                    key={collection.id}
                    value={collection.id}
                    keywords={collectionSearchKeywords(collection)}
                    onSelect={() => {
                      handleOpenChange(false);
                      router.push(collectionHref(collection.slug));
                    }}
                  >
                    <Folder className="text-muted-foreground" />
                    <span className="truncate">{collection.name}</span>
                    <CommandShortcut className="tracking-normal">
                      {collection.itemCount} {collection.itemCount === 1 ? "item" : "items"}
                    </CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </SearchPaletteContext.Provider>
  );
};

export const useSearchPalette = (): SearchPaletteContextValue => {
  const context = useContext(SearchPaletteContext);
  if (!context) throw new Error("useSearchPalette must be used inside SearchPaletteProvider");
  return context;
};
