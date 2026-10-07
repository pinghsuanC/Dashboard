import type { Plan } from "@/generated/prisma/client";
import type { SessionCollection } from "@/types/collections";
import type { ItemCounts, ItemSummary, ItemTypeDefinition } from "@/types/items";

/** The signed-in user's profile, safe to hand to client components. */
export interface CurrentUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  plan: Plan;
  isPro: boolean;
  preferredTheme: string;
  preferredFontSize: number;
  createdAt: Date;
  /** Whether the user can sign in with a password. Never the hash itself. */
  hasPassword: boolean;
}

/**
 * What the signed-in user's screens show, loaded once and held on the client
 * by `UserSessionProvider`. Items are deliberately not all here: only their
 * counts and the pinned list. Recent items are fetched by the dashboard on
 * every visit, and "view all", editing and creating load what they need.
 * Collections are few, so all of them are here. Display shapes derive from
 * it in `lib/session/session-selectors.ts`.
 */
export interface UserSession {
  user: CurrentUser;
  itemTypes: ItemTypeDefinition[];
  /** Numbers only: total, favorites, per type. */
  itemCounts: ItemCounts;
  /** Every pinned item, newest first. */
  pinnedItems: ItemSummary[];
  /** Every collection, with its item count and types. */
  collections: SessionCollection[];
}

export interface ItemStats {
  items: number;
  favoriteItems: number;
}
