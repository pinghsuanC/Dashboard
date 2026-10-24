import { PRICING } from "@/lib/constants/pricing";

/** Free plan limits (plan-rules.ts): the numbers come from `PRICING`, never typed. */
export const ITEM_LIMIT_REACHED = `Free accounts hold up to ${PRICING.free.itemLimit} items. Upgrade to Pro for unlimited items.`;
export const COLLECTION_LIMIT_REACHED = `Free accounts hold up to ${PRICING.free.collectionLimit} collections. Upgrade to Pro for unlimited collections.`;
export const PRO_TYPE_REQUIRED = "File and image uploads are a Pro feature. Upgrade to Pro to upload.";

/** Checkout and the billing portal. */
export const BILLING_UNAVAILABLE = "Billing is unavailable right now. Please try again later.";
export const BILLING_ALREADY_SUBSCRIBED =
  "You already have an active subscription. Manage it from Settings, or try again in a few minutes if you just paid.";
export const BILLING_NO_PORTAL = "There's no billing account to manage yet.";

/** Webhook route answers, read only by the vendor's delivery logs. */
export const WEBHOOK_SIGNATURE_INVALID = "Invalid signature";
export const WEBHOOK_FAILED = "Webhook handling failed";

/** Account deletion: open subscriptions are cancelled first, and that failed. */
export const BILLING_CANCEL_FAILED =
  "We couldn't cancel your subscription, so your account was kept. Please try again.";
