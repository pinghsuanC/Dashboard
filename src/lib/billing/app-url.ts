import { headers } from "next/headers";

import { BillingNotConfiguredError } from "@/lib/billing/billing-errors";

// Hosts served over plain http when no proxy says otherwise: local development.
const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

/** The first of a header's comma-separated values, as a chain of proxies writes them. */
const first = (value: string | null): string | null => value?.split(",")[0].trim() || null;

/**
 * `path` as an absolute URL on the app's own address, for the return links a
 * vendor's hosted pages send the browser back to. No setting to keep in step:
 *
 * - On Vercel, the project's production domain (`VERCEL_PROJECT_PRODUCTION_URL`,
 *   set by Vercel), over https: one stable address, even before a custom domain.
 * - Anywhere else, the request's own host and protocol (`x-forwarded-host` /
 *   `x-forwarded-proto` from a proxy, else `Host`); local hosts default to http.
 *
 * Reading the request is safe for these links: a browser always sends the
 * real host, so a forged one only misdirects the forger's own return, and
 * Next refuses a server action whose `Origin` doesn't match its host. Throws
 * `BillingNotConfiguredError` when there is neither, which callers answer
 * like any missing billing setting.
 */
export const appUrl = async (path: string): Promise<string> => {
  const vercelDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelDomain) return new URL(path, `https://${vercelDomain}`).toString();

  const requestHeaders = await headers();
  const host = first(requestHeaders.get("x-forwarded-host")) ?? first(requestHeaders.get("host"));
  if (!host) throw new BillingNotConfiguredError(["VERCEL_PROJECT_PRODUCTION_URL or a request Host header"]);
  const protocol = first(requestHeaders.get("x-forwarded-proto")) ?? (LOCAL_HOST.test(host) ? "http" : "https");
  return new URL(path, `${protocol}://${host}`).toString();
};
