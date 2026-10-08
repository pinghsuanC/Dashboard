"use client";

import { useState } from "react";
import { ImageOff, Pin, Star } from "lucide-react";

import { useItemDrawer } from "@/components/items/ItemDrawerProvider";
import { Card } from "@/components/ui/card";
import { itemFileHref } from "@/lib/constants/routes";
import { formatShortDate } from "@/lib/helpers/format";
import type { ItemSummary } from "@/types/items";

interface ImageCardProps {
  item: ItemSummary;
}

/**
 * A gallery tile for an image item: a 16:9 thumbnail that zooms slightly on
 * hover, with the title below. Like `ItemRow`, the title is a button whose
 * `::after` covers the card and opens the drawer. The thumbnail is the full
 * stored image, scaled down by the browser; there are no resized copies.
 */
export const ImageCard = ({ item }: ImageCardProps) => {
  const { openItem } = useItemDrawer();
  // An image item whose upload failed has no file; one whose file can't be
  // fetched (deleted from the bucket, signed out) fails on load. Both show
  // the placeholder instead of a broken image.
  const [failed, setFailed] = useState(false);
  const showImage = item.hasFile && !failed;

  return (
    <Card className="group hover:bg-muted/40 has-focus-visible:ring-ring/50 relative gap-0 py-0 transition-colors has-focus-visible:ring-3">
      <div className="bg-muted aspect-video overflow-hidden">
        {showImage ? (
          // Served by our own signed-in route with `no-store`; next/image would
          // fetch it again from the server without the user's session.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={itemFileHref(item.id)}
            // The title is right below, so the image adds nothing to read out.
            alt=""
            loading="lazy"
            onError={() => setFailed(true)}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none"
          />
        ) : (
          <div className="text-muted-foreground grid size-full place-items-center">
            <ImageOff className="size-8" aria-hidden />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 p-3">
        <h3 className="min-w-0 font-medium">
          <button
            type="button"
            onClick={() => openItem(item)}
            className="block max-w-full truncate text-left outline-none after:absolute after:inset-0 after:content-['']"
          >
            {item.title}
          </button>
        </h3>
        {item.isPinned && <Pin className="text-muted-foreground size-3.5 shrink-0" />}
        {item.isFavorite && <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />}
        <time
          dateTime={item.updatedAt.toISOString()}
          className="text-muted-foreground ml-auto shrink-0 text-xs"
        >
          {formatShortDate(item.updatedAt)}
        </time>
      </div>
    </Card>
  );
};
