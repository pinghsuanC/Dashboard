import { tooManyAttempts } from "@/lib/constants/messages/auth";
import { MINUTE_MS, SECOND_MS } from "@/lib/constants/time";

// How a blocked attempt is told to the caller. The check itself is
// `checkRateLimit` in `@/services/rate-limit`; this only words its `reset`.

/** Seconds until `reset`, for a `Retry-After` header. At least 1. */
export const retryAfterSeconds = (reset: number, now = Date.now()): number =>
  Math.max(1, Math.ceil((reset - now) / SECOND_MS));

/** "Too many attempts. Please try again in X minutes." Rounds up, at least 1. */
export const rateLimitMessage = (reset: number, now = Date.now()): string =>
  tooManyAttempts(Math.max(1, Math.ceil((reset - now) / MINUTE_MS)));
