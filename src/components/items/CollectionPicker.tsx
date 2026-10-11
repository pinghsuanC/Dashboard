"use client";

import { useState } from "react";
import { ChevronsUpDown, X } from "lucide-react";

import { useUserSession } from "@/components/session/UserSessionProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface CollectionPickerProps {
  id: string;
  /** The picked collection ids. */
  value: string[];
  onChange: (ids: string[]) => void;
  ariaDescribedBy?: string;
  ariaInvalid?: boolean;
}

// Each item's keywords hold its name: cmdk's default filter also scores the
// value, which is the id here, so a search for "a" would match every uuid.
const byName = (_value: string, search: string, keywords?: string[]) =>
  keywords?.some((name) => name.toLowerCase().includes(search.trim().toLowerCase())) ? 1 : 0;

/**
 * The item form's collections field: a searchable list of the user's
 * collections in a popover, toggled on and off, with the picked ones as
 * removable chips under the trigger. The options come from the user
 * session, so opening it fetches nothing.
 *
 * `modal`: the popover is portalled out of the dialog or drawer it sits in,
 * whose scroll lock would otherwise swallow wheel scrolling in the list.
 */
export const CollectionPicker = ({ id, value, onChange, ariaDescribedBy, ariaInvalid }: CollectionPickerProps) => {
  const { collections } = useUserSession();
  const [open, setOpen] = useState(false);
  const sorted = [...collections].sort((a, b) => a.name.localeCompare(b.name));
  // In list order, and only ids the session knows: a collection deleted
  // elsewhere drops out rather than showing as a nameless chip.
  const picked = sorted.filter((collection) => value.includes(collection.id));

  const toggle = (collectionId: string) =>
    onChange(value.includes(collectionId) ? value.filter((id) => id !== collectionId) : [...value, collectionId]);

  if (collections.length === 0) {
    return (
      <p id={id} className="text-muted-foreground text-sm">
        No collections yet. Create one with New Collection, then add items to it here.
      </p>
    );
  }

  return (
    <div className="grid gap-2">
      <Popover open={open} onOpenChange={setOpen} modal>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-describedby={ariaDescribedBy}
            aria-invalid={ariaInvalid || undefined}
            className="w-full justify-between font-normal"
          >
            <span className={picked.length === 0 ? "text-muted-foreground" : undefined}>
              {picked.length === 0
                ? "Choose collections"
                : `${picked.length} collection${picked.length === 1 ? "" : "s"} chosen`}
            </span>
            <ChevronsUpDown className="opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-(--radix-popover-trigger-width) p-0">
          <Command filter={byName}>
            <CommandInput placeholder="Search collections…" />
            <CommandList>
              <CommandEmpty>No collection matches.</CommandEmpty>
              <CommandGroup>
                {sorted.map((collection) => (
                  <CommandItem
                    key={collection.id}
                    value={collection.id}
                    keywords={[collection.name]}
                    // cmdk owns aria-selected (the highlighted row); this drives the check mark.
                    data-checked={value.includes(collection.id)}
                    onSelect={() => toggle(collection.id)}
                  >
                    <span className="truncate">{collection.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {picked.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Chosen collections">
          {picked.map((collection) => (
            <li key={collection.id}>
              <Badge variant="secondary" className="gap-1 pr-1">
                {collection.name}
                <button
                  type="button"
                  onClick={() => toggle(collection.id)}
                  aria-label={`Remove ${collection.name}`}
                  className="hover:bg-foreground/10 rounded-sm p-0.5"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
