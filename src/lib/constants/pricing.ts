/**
 * Plan prices and limits as the homepage advertises them, in whole US
 * dollars. The Free limits are enforced on the server (`lib/billing/plan-rules.ts`);
 * what is charged is the Stripe prices (`STRIPE_PRICE_ID_*`), which must match
 * these. Copy that mentions a price or a saving derives it from these
 * through `src/lib/pricing/pricing.ts`, never as typed text.
 */
export const PRICING = {
  free: { price: 0, itemLimit: 50, collectionLimit: 3 },
  pro: { monthlyPrice: 8, yearlyPrice: 72 },
} as const;

/** Currency formatting for prices. Pinned, like DATE_LOCALE, so server and browser agree. */
export const PRICE_LOCALE = "en-US";
export const PRICE_CURRENCY = "USD";
