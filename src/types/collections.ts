import type { ItemRowType } from "@/types/items";

/**
 * A collection as the session holds it, with its item count and types
 * worked out at load time: the session doesn't hold every item, so they
 * can't be derived on the client.
 */
export interface SessionCollection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isFavorite: boolean;
  updatedAt: Date;
  itemCount: number;
  /** Every type in the collection, most-used first: `types[0]` tints the card. */
  types: ItemRowType[];
}

/** The New Collection payload once validated; the slug is derived from the name when stored. */
export interface CollectionCreate {
  name: string;
  description: string | null;
  isFavorite: boolean;
}

/** The New Collection dialog's fields as typed, before validation. */
export interface CollectionDraft {
  name: string;
  description: string;
  isFavorite: boolean;
}

/** What a collection page's header shows; its items load separately. */
export type CollectionHeader = Pick<SessionCollection, "id" | "name" | "slug" | "description" | "isFavorite">;

/** What a collection card shows. */
export type CollectionSummary = Omit<SessionCollection, "updatedAt">;

export interface CollectionStats {
  collections: number;
  favoriteCollections: number;
}

/** What a sidebar collection row shows. */
export interface SidebarCollection {
  id: string;
  name: string;
  slug: string;
  itemCount: number;
  /** Colour of the most-used item type; null for an empty collection. */
  color: string | null;
}

export interface SidebarCollections {
  favorites: SidebarCollection[];
  /** Non-favorites only, so no collection is listed twice. */
  recents: SidebarCollection[];
}
