import "server-only";

import type { BillingVendor } from "@/generated/prisma/client";
import { BillingNotConfiguredError } from "@/lib/billing/billing-errors";
import { stripeBilling } from "@/services/billing/stripe";
import type { BillingAdapter } from "@/types/billing";

// Every vendor, whatever BILLING_VENDOR says: an existing period is checked,
// and its webhooks verified, with the vendor it came from. Granted periods
// have no vendor and never reach an adapter.
const ADAPTERS: Record<BillingVendor, BillingAdapter> = { STRIPE: stripeBilling };

/** The adapter a stored period's `vendor` names. */
export const adapterFor = (vendor: BillingVendor): BillingAdapter => ADAPTERS[vendor];

/**
 * The adapter for a webhook URL's `[vendor]` segment (`/api/billing/stripe/webhook`),
 * matched exactly in lower case; null for anything else, which the route answers 404.
 */
export const adapterForSegment = (segment: string): BillingAdapter | null =>
  Object.values(ADAPTERS).find((adapter) => adapter.vendor.toLowerCase() === segment) ?? null;

/**
 * The adapter new checkouts use: `BILLING_VENDOR` (any case), default Stripe.
 * A value naming no vendor throws `BillingNotConfiguredError`.
 */
export const checkoutAdapter = (): BillingAdapter => {
  const name = (process.env.BILLING_VENDOR || "stripe").trim().toUpperCase();
  const adapter = Object.values(ADAPTERS).find((candidate) => candidate.vendor === name);
  if (!adapter) throw new BillingNotConfiguredError(["BILLING_VENDOR"]);
  return adapter;
};
