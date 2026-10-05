import { NOT_FOUND } from "@/lib/constants/messages/common";
import { getItemDetail } from "@/lib/db/items";

// The item drawer's fetch. No proxy match on /api, so the guard is the
// loader's `requireCurrentUserId()`: signed out, it redirects to sign-in.
export const GET = async (_request: Request, { params }: RouteContext<"/api/items/[id]">) => {
  const { id } = await params;
  const item = await getItemDetail(id);
  if (!item) return Response.json({ error: NOT_FOUND }, { status: 404 });
  return Response.json(item);
};
