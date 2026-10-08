import { NOT_FOUND } from "@/lib/constants/messages/common";
import { getItemDetail } from "@/lib/db/items";

// The item drawer's fetch. Signed out, the proxy answers 401 first; a
// revoked session gets past it, and the loader's `requireCurrentUserId()`
// redirects that one to sign-in.
export const GET = async (_request: Request, { params }: RouteContext<"/api/items/[id]">) => {
  const { id } = await params;
  const item = await getItemDetail(id);
  if (!item) return Response.json({ error: NOT_FOUND }, { status: 404 });
  return Response.json(item);
};
