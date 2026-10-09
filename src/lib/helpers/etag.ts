import { createHash } from "node:crypto";

/**
 * A strong ETag for a value that changes whenever the content does (a
 * never-reused storage key, say). Hashed, so the value itself never reaches
 * the client.
 */
export const etagFor = (value: string): string =>
  `"${createHash("sha256").update(value).digest("base64url")}"`;

/**
 * Whether an `If-None-Match` header matches `etag`. Weak comparison, as HTTP
 * requires for this header: a `W/` prefix is ignored, a list matches if any
 * entry does, and `*` matches anything.
 */
export const ifNoneMatchMatches = (header: string | null, etag: string): boolean => {
  if (!header) return false;
  const opaque = etag.replace(/^W\//, "");
  return header.split(",").some((entry) => {
    const tag = entry.trim();
    return tag === "*" || tag.replace(/^W\//, "") === opaque;
  });
};
