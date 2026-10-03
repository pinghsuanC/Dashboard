import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";

import { HOST_PATTERN, LOCAL_HOST_PATTERN, TOKEN_BYTES } from "@/lib/constants/security";

/** The raw token that goes in the emailed link. Never stored. */
export const newToken = () => randomBytes(TOKEN_BYTES).toString("base64url");

// Only the hash is stored: a leaked row can't be replayed as a link.
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");


/**
 * Where emailed links point. AUTH_URL wins when set; otherwise the request's
 * `host`, which is right on localhost and on Vercel. `x-forwarded-host` is
 * ignored: a proxy that passes it through from the client would let anyone
 * mail a valid token to a link on their own domain.
 */
export const appOrigin = async (): Promise<string> => {
  if (process.env.AUTH_URL) return new URL(process.env.AUTH_URL).origin;
  const h = await headers();
  const host = h.get("host") ?? "";
  if (!HOST_PATTERN.test(host)) throw new Error(`Refusing to build a link for host: ${host}`);
  const isLocal = LOCAL_HOST_PATTERN.test(host);
  return `${isLocal ? "http" : "https"}://${host}`;
};
