import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";

/** The raw token that goes in the emailed link. Never stored. */
export const newToken = () => randomBytes(32).toString("base64url");

// Only the hash is stored: a leaked row can't be replayed as a link.
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

// hostname[:port] only, so a forged header can't smuggle a path or markup.
const HOST_PATTERN = /^[a-z0-9.-]+(:\d+)?$/i;

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
  const isLocal = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  return `${isLocal ? "http" : "https"}://${host}`;
};
