import {
  FALLBACK_CONTENT_TYPE,
  FALLBACK_FILE_BASE_NAME,
  FILE_CACHE_CONTROL,
  FILE_DOWNLOAD_PARAM,
  FILE_RESPONSE_SECURITY_HEADERS,
  isRevalidatedFileItemType,
} from "@/lib/constants/files";
import { NOT_FOUND } from "@/lib/constants/messages/common";
import { getItemFile } from "@/lib/db/items";
import { etagFor, ifNoneMatchMatches } from "@/lib/helpers/etag";
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
 * Image items may be kept by the browser: they carry an ETag (a hash of the
 * storage key, which a new upload replaces) and `no-cache`, so the browser
 * asks again on every use and a matching `If-None-Match` answers 304 without
 * reading storage. File items stay `no-store`: never kept, so another user
 * of this browser can't get one from the cache by URL.
 *
 * The proxy answers a signed-out request with 401 before this runs; the
 * session is checked again here, since only `getCurrentUser()` sees revoked
 * sessions. Both checks, and ownership, run before any 304.
 */
export const GET = async (request: Request, { params }: RouteContext<"/api/items/[id]/file">) => {
  const userId = await requireCurrentUserId();
  const { id } = await params;

  const item = await getItemFile(id);
  if (!item) return notFound();

  const revalidated = isRevalidatedFileItemType(item.typeName);
  const etag = revalidated ? etagFor(item.fileKey) : null;
  const cacheHeaders: Record<string, string> = etag
    ? { ETag: etag, "Cache-Control": FILE_CACHE_CONTROL.revalidated }
    : { "Cache-Control": FILE_CACHE_CONTROL.notStored };

  // Before reading storage: the browser's copy is current, so skip the read.
  // Known issue: an image whose object has gone from storage still answers
  // 304 here, so a browser that cached it keeps showing it until evicted.
  if (etag && ifNoneMatchMatches(request.headers.get("if-none-match"), etag)) {
    return new Response(null, { status: 304, headers: { ...FILE_RESPONSE_SECURITY_HEADERS, ...cacheHeaders } });
  }

  const file = await getFile(userId, item.fileKey);
  if (!file) return notFound();

  const asDownload =
    new URL(request.url).searchParams.get(FILE_DOWNLOAD_PARAM.param) === FILE_DOWNLOAD_PARAM.value;
  const inline = !asDownload && (item.mimeType?.startsWith("image/") ?? false);
  const name = item.fileName ?? FALLBACK_FILE_BASE_NAME;

  return new Response(file.body, {
    headers: {
      ...FILE_RESPONSE_SECURITY_HEADERS,
      ...cacheHeaders,
      "Content-Type": item.mimeType ?? FALLBACK_CONTENT_TYPE,
      ...(file.size !== null && { "Content-Length": String(file.size) }),
      "Content-Disposition": contentDisposition(inline ? "inline" : "attachment", name),
    },
  });
};
