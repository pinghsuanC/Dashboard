import { BILLING_GRACE_MS } from "@/lib/constants/billing";

/** Periods ending at or after this instant are live. */
export const liveSince = (now: Date = new Date()): Date => new Date(now.getTime() - BILLING_GRACE_MS);
