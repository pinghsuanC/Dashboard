import { BillingNotConfiguredError } from "@/lib/billing/billing-errors";

/**
 * `path` as an absolute URL on `APP_URL`, for the return links a vendor's
 * hosted pages send the browser back to. Never built from the request's
 * `Host` header, which the caller controls. Throws
 * `BillingNotConfiguredError` naming `APP_URL` when it is unset.
 */
export const appUrl = (path: string): string => {
  const base = process.env.APP_URL;
  if (!base) throw new BillingNotConfiguredError(["APP_URL"]);
  return new URL(path, base).toString();
};
