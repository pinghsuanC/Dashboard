import { signInHref } from "@/lib/auth/auth-redirect";
import { itemApiHref } from "@/lib/constants/routes";
import { reviveDates } from "@/lib/helpers/revive-dates";
import type { ItemDetail, ItemDetailResult } from "@/types/items";
import type { Jsonified } from "@/types/json";

/**
 * Loads one item for the drawer from `GET /api/items/[id]`. Never throws.
 *
 * Signed out, the proxy answers 401, and sign-in should bring the user back
 * to the page they are on. A session the proxy accepts but the database has
 * revoked still gets the route's redirect to sign-in, which `fetch` follows
 * silently, so a sign-in page comes back as a 200; `redirected` is the only
 * tell. The drawer's own fetches never redirect otherwise.
 */
export const fetchItemDetail = async (id: string): Promise<ItemDetailResult> => {
  try {
    const response = await fetch(itemApiHref(id), { headers: { accept: "application/json" } });
    if (response.status === 401) {
      return { status: "signed-out", url: signInHref(location.pathname + location.search) };
    }
    if (response.redirected) return { status: "signed-out", url: response.url };
    if (response.status === 404) return { status: "not-found" };
    if (!response.ok) return { status: "error" };

    const item = (await response.json()) as Jsonified<ItemDetail>;
    return { status: "ok", item: reviveDates<ItemDetail>(item, { createdAt: true, updatedAt: true }) };
  } catch {
    return { status: "error" };
  }
};
