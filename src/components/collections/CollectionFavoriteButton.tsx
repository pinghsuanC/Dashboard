"use client";

import { Star } from "lucide-react";

import { setCollectionFavorite } from "@/actions/collections";
import { FlagButton } from "@/components/shared/FlagButton";
import { cn } from "@/lib/utils";

interface CollectionFavoriteButtonProps {
  collectionId: string;
  isFavorite: boolean;
}

/**
 * The collection page's star, beside Edit and Delete. The action's refresh
 * re-sends the page, so `isFavorite` arrives new from the server; a collection
 * found gone is handled there too, as the page answers not found.
 */
export const CollectionFavoriteButton = ({ collectionId, isFavorite }: CollectionFavoriteButtonProps) => (
  <FlagButton
    variant="outline"
    size="icon"
    aria-label="Favorite collection"
    value={isFavorite}
    save={(next) => setCollectionFavorite(collectionId, next)}
    className={(on) => cn(on && "text-amber-400")}
  >
    {(on) => <Star className={cn(on && "fill-amber-400")} />}
  </FlagButton>
);
