import "server-only";

import { Ratelimit, type Duration } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/** One sliding-window policy per auth flow. */
export const RATE_LIMITS = {
  signIn: { limit: 5, window: "15 m" },
  register: { limit: 3, window: "1 h" },
  forgotPassword: { limit: 3, window: "1 h" },
  resetPassword: { limit: 5, window: "15 m" },
  resendVerification: { limit: 3, window: "15 m" },
} as const satisfies Record<string, { limit: number; window: Duration }>;

export type RateLimitPolicy = keyof typeof RATE_LIMITS;

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  /**
   * When the window frees up again, in epoch milliseconds. Known issue: Upstash's
   * sliding window reports the end of its current fixed sub-window, so with
   * attempts spread over two sub-windows a caller can still be blocked for a
   * while after it, and "try again in X minutes" is a lower bound.
   */
  reset: number;
}

// How long a check may wait on Upstash before the request goes through
// anyway. Ratelimit answers `success: true` when it times out.
const TIMEOUT_MS = 1500;

// Keys are per environment, so dev and prod can't share buckets even if they
// ever point at the same database.
const KEY_PREFIX = `devstash:${process.env.VERCEL_ENV ?? process.env.NODE_ENV}:ratelimit`;

// Built lazily, on the first check, so a missing env var only switches
// limiting off instead of throwing at import (`Redis.fromEnv()` would).
// Holds no per-user state, so sharing it across requests is fine.
let limiters: Map<RateLimitPolicy, Ratelimit> | null | undefined;

const getLimiters = () => {
  if (limiters !== undefined) return limiters;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    console.warn("Rate limiting is off: UPSTASH_REDIS_REST_URL / _TOKEN are not set");
    limiters = null;
    return limiters;
  }

  const redis = new Redis({ url, token });
  limiters = new Map(
    Object.entries(RATE_LIMITS).map(([policy, { limit, window }]) => [
      policy as RateLimitPolicy,
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(limit, window),
        prefix: `${KEY_PREFIX}:${policy}`,
        timeout: TIMEOUT_MS,
      }),
    ]),
  );
  return limiters;
};

/**
 * The caller's IP: the first `x-forwarded-for` entry, else `x-real-ip`.
 * Vercel overwrites both, so they can't be forged there; behind a proxy that
 * passes the client's own value through, a client could pick its bucket.
 */
export const clientIp = (headers: Headers): string =>
  headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
  headers.get("x-real-ip")?.trim() ||
  "unknown";

/**
 * Counts one attempt against `policy`, keyed by the caller's IP plus the
 * email when given (normalised, so a change of case doesn't get a fresh
 * bucket). Fails open: with Upstash unset, down or slow, the request is
 * allowed and the error logged.
 */
export const checkRateLimit = async (
  policy: RateLimitPolicy,
  headers: Headers,
  email?: string,
): Promise<RateLimitResult> => {
  const ip = clientIp(headers);
  const key = email ? `${ip}:${email.trim().toLowerCase()}` : ip;
  const allowed = { success: true, remaining: RATE_LIMITS[policy].limit, reset: Date.now() };

  const limiter = getLimiters()?.get(policy);
  if (!limiter) return allowed;

  try {
    const { success, remaining, reset } = await limiter.limit(key);
    return { success, remaining, reset };
  } catch (error) {
    console.error(`Rate limit check failed (${policy}); allowing the request`, error);
    return allowed;
  }
};

/** Seconds until `reset`, for a `Retry-After` header. At least 1. */
export const retryAfterSeconds = (reset: number, now = Date.now()): number =>
  Math.max(1, Math.ceil((reset - now) / 1000));

/** "Too many attempts. Please try again in X minutes." Rounds up, at least 1. */
export const rateLimitMessage = (reset: number, now = Date.now()): string => {
  const minutes = Math.max(1, Math.ceil((reset - now) / 60_000));
  return `Too many attempts. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
};

/** Forgets the built limiters, so tests can change the env between cases. */
export const resetRateLimitersForTests = () => {
  limiters = undefined;
};
