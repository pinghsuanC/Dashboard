import { itemApiHref } from "@/lib/constants/routes";
import { reviveDates } from "@/lib/helpers/revive-dates";
import type { ItemDetail, ItemDetailResult } from "@/types/items";
import type { Jsonified } from "@/types/json";

/**
 * Loads one item for the drawer from `GET /api/items/[id]`. Never throws.
 *
 * Signed out, the route's guard redirects to sign-in and `fetch` follows it
 * silently, so a sign-in page comes back as a 200; `redirected` is the only
 * tell. The drawer's own fetches never redirect otherwise.
 */
export const fetchItemDetail = async (id: string): Promise<ItemDetailResult> => {
  try {
    const response = await fetch(itemApiHref(id), { headers: { accept: "application/json" } });
    if (response.redirected) return { status: "signed-out", url: response.url };
    if (response.status === 404) return { status: "not-found" };
    if (!response.ok) return { status: "error" };

    const item = (await response.json()) as Jsonified<ItemDetail>;
    return { status: "ok", item: reviveDates<ItemDetail>(item, { createdAt: true, updatedAt: true }) };
  } catch {
    return { status: "error" };
  }
};
