import "server-only";

import { refresh } from "next/cache";
import { cache } from "react";

import { type SessionCollection, getSessionCollections } from "@/lib/db/collections";
import { type CurrentUser, requireCurrentUser } from "@/lib/db/current-user";
import { type ItemTypeDefinition, getSystemItemTypeDefinitions } from "@/lib/db/item-types";
import {
  type ItemCounts,
  type ItemSummary,
  getItemCounts,
  getPinnedItems,
} from "@/lib/db/items";

/**
 * What the signed-in user's screens show, loaded once and held on the client
 * by `UserSessionProvider`. Items are deliberately not all here: only their
 * counts and the pinned list. Recent items are fetched by the dashboard on
 * every visit, and "view all", editing and creating load what they need.
 * Collections are few, so all of them are here. Display shapes derive from
 * it in `session-selectors.ts`.
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

/**
 * Loads the session. Called by the `(app)` layout only, which runs on a full
 * page load (e.g. right after sign-in) and on an explicit reset, not on
 * navigation: the layout stays mounted and the client keeps the session.
 * Pages read it through `useUserSession()` instead of calling this, so a
 * navigation costs no query.
 *
 * "Already loaded" lives on the client, never here. This module is shared by
 * every user the server process handles, so an initialized flag or a
 * module-level copy would hand one user's session to the next request. Within
 * one request it is cached, so the layout and the sidebar share one load.
 * The user lookup (shared, cached, by every loader in this request) is also
 * the auth check that sends a valid token with a deleted user to sign-in.
 */
export const getUserSession = cache(async (): Promise<UserSession> => {
  const [user, itemTypes, itemCounts, pinnedItems, collections] = await Promise.all([
    requireCurrentUser(),
    getSystemItemTypeDefinitions(),
    getItemCounts(),
    getPinnedItems(),
    getSessionCollections(),
  ]);
  return { user, itemTypes, itemCounts, pinnedItems, collections };
});

/**
 * Server-side reset: call at the end of a server action that changed session
 * data. It re-renders the current route, so the layout loads a fresh session
 * and the provider replaces its copy. Server actions only; client code uses
 * `resetProfile()` from `useUserSession()`.
 */
export const resetProfile = () => {
  refresh();
};
