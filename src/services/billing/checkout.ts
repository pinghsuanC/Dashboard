import "server-only";

import type { BillingInterval } from "@/generated/prisma/client";
import { appUrl } from "@/lib/billing/app-url";
import { FLAGS, ROUTES, withFlag } from "@/lib/constants/routes";
import { settleCheckout } from "@/services/billing/entitlement";
import { checkoutAdapter } from "@/services/billing/vendors";
import { prisma } from "@/services/prisma";
import type { CheckoutStart } from "@/types/billing";

/**
 * Starts a checkout for a Free user. Called only by `startCheckout`, which
 * has already checked the session, the plan and the rate limit.
 *
 * Settings come first (the vendor's, and the app's own address), so missing config throws
 * `BillingNotConfiguredError` before anything is written. Then:
 * 1. The newest pending checkout with a vendor session is asked about: still
 *    open, the user is sent back to it and nothing is inserted; expired, it
 *    is marked `EXPIRED`; paid but not yet settled, it is settled now and the
 *    user is already subscribed.
 * 2. A returning customer (their latest paid row's customer) with an open
 *    subscription at the vendor is already subscribed: no second one.
 * 3. Otherwise one `PENDING` period is inserted, the vendor's checkout is
 *    created tied to its id, and the vendor's checkout id is stored on it.
 */
export const beginCheckout = async (
  user: { id: string; email: string },
  interval: BillingInterval,
): Promise<CheckoutStart> => {
  const adapter = checkoutAdapter();
  adapter.assertConfigured();
  const successUrl = await appUrl(withFlag(ROUTES.billings, FLAGS.billingSuccess));
  const cancelUrl = await appUrl(withFlag(ROUTES.billings, FLAGS.billingCanceled));

  const pending = await prisma.subscriptionPeriod.findFirst({
    where: { userId: user.id, status: "PENDING", vendor: adapter.vendor, stripeCheckoutSessionId: { not: null } },
    orderBy: [{ createdAt: "desc" }],
    select: { id: true, stripeCheckoutSessionId: true },
  });
  if (pending?.stripeCheckoutSessionId) {
    const state = await adapter.fetchCheckout(pending.stripeCheckoutSessionId);
    if (state.state === "open" && state.url) return { kind: "redirect", url: state.url };
    // Paid: settled here, as the webhook and the session load would.
    // Expired: marked, then a new checkout below.
    await settleCheckout(pending.id, pending.stripeCheckoutSessionId, state);
    if (state.state === "paid") return { kind: "already-subscribed" };
  }

  // Only a paid row has a customer: settling is what writes it.
  const lastPaid = await prisma.subscriptionPeriod.findFirst({
    where: { userId: user.id, vendor: adapter.vendor, vendorCustomerId: { not: null } },
    orderBy: [{ createdAt: "desc" }],
    select: { vendorCustomerId: true },
  });
  const customerId = lastPaid?.vendorCustomerId ?? null;
  if (customerId && (await adapter.hasOpenSubscription(customerId))) return { kind: "already-subscribed" };

  // Known gap: two Upgrade clicks at the same instant (two tabs) can both find
  // no pending checkout and each insert one, so the user gets two Stripe
  // sessions. Paying the second is refused by Stripe's "limit customers to one
  // subscription" Checkout setting (it matches the customer or email); the
  // unpaid one expires and is marked `EXPIRED` on a later load.
  const period = await prisma.subscriptionPeriod.create({
    data: { userId: user.id, status: "PENDING", vendor: adapter.vendor, interval },
    select: { id: true },
  });
  // Known gap: if the vendor call throws here, the row stays `PENDING` with
  // no checkout id. It grants nothing, the session load and step 1 above skip
  // it (they look only at rows with a checkout id), and the next checkout
  // inserts a fresh row.
  const { url, checkoutId } = await adapter.createCheckout({
    periodId: period.id,
    userId: user.id,
    email: user.email,
    customerId,
    interval,
    successUrl,
    cancelUrl,
  });
  await prisma.subscriptionPeriod.update({ where: { id: period.id }, data: { stripeCheckoutSessionId: checkoutId } });
  return { kind: "redirect", url };
};
