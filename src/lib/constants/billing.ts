import { DAY_MS } from "@/lib/constants/time";

/** A period stays live this long past its end, so a renewal charged at the end has time to be recorded. */
export const BILLING_GRACE_MS = 1 * DAY_MS;
