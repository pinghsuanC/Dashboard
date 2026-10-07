import { itemApiHref } from "@/lib/constants/routes";
import type { ItemDetail, ItemDetailResult } from "@/types/items";

type ItemDetailJson = Omit<ItemDetail, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

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

    const item = (await response.json()) as ItemDetailJson;
    return {
      status: "ok",
      item: { ...item, createdAt: new Date(item.createdAt), updatedAt: new Date(item.updatedAt) },
    };
  } catch {
    return { status: "error" };
  }
};
