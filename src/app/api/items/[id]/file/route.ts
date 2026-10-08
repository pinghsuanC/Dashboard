import {
  FALLBACK_CONTENT_TYPE,
  FALLBACK_FILE_BASE_NAME,
  FILE_DOWNLOAD_PARAM,
  FILE_RESPONSE_SECURITY_HEADERS,
} from "@/lib/constants/files";
import { NOT_FOUND } from "@/lib/constants/messages/common";
import { getItemFile } from "@/lib/db/items";
import { contentDisposition } from "@/lib/helpers/file-name";
import { requireCurrentUserId } from "@/services/auth/session";
import { getFile } from "@/services/storage";

const notFound = () =>
  Response.json({ error: NOT_FOUND }, { status: 404, headers: FILE_RESPONSE_SECURITY_HEADERS });

/**
 * The stored file of one of the user's file or image items, streamed from
 * storage (streamed responses aren't held to Vercel's 4.5 MB body limit).
 * Images show inline unless `?download=1`; other files always download.
 * Missing, another user's, without a file, or gone from storage: all 404.
 *
 * The proxy answers a signed-out request with 401 before this runs; the
 * session is checked again here, since only `getCurrentUser()` sees revoked
 * sessions.
 */
export const GET = async (request: Request, { params }: RouteContext<"/api/items/[id]/file">) => {
  const userId = await requireCurrentUserId();
  const { id } = await params;

  const item = await getItemFile(id);
  if (!item) return notFound();
  const file = await getFile(userId, item.fileKey);
  if (!file) return notFound();

  const asDownload =
    new URL(request.url).searchParams.get(FILE_DOWNLOAD_PARAM.param) === FILE_DOWNLOAD_PARAM.value;
  const inline = !asDownload && (item.mimeType?.startsWith("image/") ?? false);
  const name = item.fileName ?? FALLBACK_FILE_BASE_NAME;

  return new Response(file.body, {
    headers: {
      ...FILE_RESPONSE_SECURITY_HEADERS,
      "Content-Type": item.mimeType ?? FALLBACK_CONTENT_TYPE,
      ...(file.size !== null && { "Content-Length": String(file.size) }),
      "Content-Disposition": contentDisposition(inline ? "inline" : "attachment", name),
      // Never shared, and not kept: another user of this browser could
      // otherwise get it from the cache by URL.
      "Cache-Control": "private, no-store",
    },
  });
};
