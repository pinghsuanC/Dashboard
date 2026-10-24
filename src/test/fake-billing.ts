import { vi } from "vitest";

import type { BillingAdapter, PaidPeriod } from "@/types/billing";

/**
 * A recording stand-in for the Stripe adapter, so billing tests check what
 * was asked of the vendor and what ended up stored, with no network. Each
 * method is a `vi.fn()` with a harmless default that a test overrides; reset
 * them all with `resetFakeBilling()`. Mock `@/services/billing/vendors` with
 * `fakeVendors` to route every lookup here.
 */
export const fakeAdapter = {
  vendor: "STRIPE",
  assertConfigured: vi.fn(),
  createCheckout: vi.fn(),
  fetchCheckout: vi.fn(),
  fetchActivePeriod: vi.fn(),
  hasOpenSubscription: vi.fn(),
  parseWebhook: vi.fn(),
  createPortalLink: vi.fn(),
  cancelAll: vi.fn(),
  cancelSubscription: vi.fn(),
} satisfies BillingAdapter;

export const resetFakeBilling = () => {
  for (const method of Object.values(fakeAdapter)) {
    if (typeof method === "function") method.mockReset();
  }
  fakeAdapter.createCheckout.mockImplementation(async ({ periodId }: { periodId: string }) => ({
    url: `https://checkout.test/${periodId}`,
    checkoutId: `cs_${periodId}`,
  }));
  fakeAdapter.fetchActivePeriod.mockResolvedValue(null);
  fakeAdapter.hasOpenSubscription.mockResolvedValue(false);
  fakeAdapter.createPortalLink.mockResolvedValue("https://portal.test/session");
};

/** `@/services/billing/vendors`, with every vendor and segment answered by `fakeAdapter`. */
export const fakeVendors = {
  adapterFor: () => fakeAdapter,
  adapterForSegment: (segment: string) => (segment === "stripe" ? fakeAdapter : null),
  checkoutAdapter: () => fakeAdapter,
};

const DAY = 24 * 60 * 60 * 1000;

/** A paid period as the vendor reports it, ending `endsInDays` from `now`. */
export const paidPeriod = (overrides: Partial<PaidPeriod> = {}, now = new Date(), endsInDays = 30): PaidPeriod => ({
  vendor: "STRIPE",
  customerId: "cus_ada",
  subscriptionId: "sub_ada",
  stripePriceId: "price_month",
  interval: "MONTH",
  periodStart: new Date(now.getTime() - DAY),
  periodEnd: new Date(now.getTime() + endsInDays * DAY),
  ...overrides,
});
