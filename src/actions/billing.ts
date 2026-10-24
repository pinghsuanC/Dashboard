"use server";

import { headers } from "next/headers";
import { redirect, unstable_rethrow } from "next/navigation";

import { BillingInterval } from "@/generated/prisma/client";
import { rateLimitMessage } from "@/lib/auth/rate-limit-messages";
import { appUrl } from "@/lib/billing/app-url";
import { BillingNotConfiguredError } from "@/lib/billing/billing-errors";
import { BILLING_ALREADY_SUBSCRIBED, BILLING_NO_PORTAL, BILLING_UNAVAILABLE } from "@/lib/constants/messages/billing";
import { FIELDS_INVALID, SOMETHING_WENT_WRONG } from "@/lib/constants/messages/common";
import { ROUTES } from "@/lib/constants/routes";
import { getBillingCustomers } from "@/lib/db/billing";
import { requireCurrentUser } from "@/services/auth/session";
import { beginCheckout } from "@/services/billing/checkout";
import { adapterFor } from "@/services/billing/vendors";
import { checkRateLimit } from "@/services/rate-limit";
import type { FormState } from "@/types/forms";

// Neither action accepts anything that becomes a period: the interval picks a
// price, and every id comes from the session user's own rows.

/** Missing settings and other failures, worded; the details go to the log. */
const failure = (error: unknown, label: string): FormState => {
  if (error instanceof BillingNotConfiguredError) {
    console.error(`${label} unavailable; missing settings:`, error.missing.join(", "));
    return { toast: BILLING_UNAVAILABLE };
  }
  console.error(`${label} failed:`, error);
  return { toast: SOMETHING_WENT_WRONG };
};

/**
 * Settings' Upgrade buttons (`interval` from a hidden field, `MONTH` or
 * `YEAR`). Sends the browser to the vendor's checkout, or back with a toast:
 * already subscribed, over the `checkout` rate limit, or billing unavailable.
 * A Pro user has nothing to buy and is sent to settings.
 */
export const startCheckout = async (_state: FormState, formData: FormData): Promise<FormState> => {
  // First and outside the try: the sign-in redirect must propagate, and the
  // row it reads must exist before anything is written for it.
  const user = await requireCurrentUser();
  if (user.isPro) redirect(ROUTES.settings);

  const interval = formData.get("interval");
  if (interval !== BillingInterval.MONTH && interval !== BillingInterval.YEAR) return { toast: FIELDS_INVALID };

  // Per user alone (`perIp: false`): each attempt may create a vendor session.
  const limit = await checkRateLimit("checkout", await headers(), user.id);
  if (!limit.success) return { toast: rateLimitMessage(limit.reset) };

  let url: string;
  try {
    const start = await beginCheckout(user, interval);
    if (start.kind === "already-subscribed") return { toast: BILLING_ALREADY_SUBSCRIBED };
    url = start.url;
  } catch (error) {
    unstable_rethrow(error);
    return failure(error, "Checkout");
  }
  // Outside the try: redirect() throws.
  redirect(url);
};

/**
 * Settings' Manage button: the vendor's hosted portal (payment methods,
 * invoices, cancelling) for the user's newest customer, returning to settings.
 */
export const openBillingPortal = async (): Promise<FormState> => {
  await requireCurrentUser();

  let url: string;
  try {
    const [newest] = await getBillingCustomers();
    if (!newest) return { toast: BILLING_NO_PORTAL };
    url = await adapterFor(newest.vendor).createPortalLink(newest.customerId, appUrl(ROUTES.settings));
  } catch (error) {
    unstable_rethrow(error);
    return failure(error, "Billing portal");
  }
  redirect(url);
};
