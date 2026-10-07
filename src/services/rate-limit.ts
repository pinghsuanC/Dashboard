import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import {
  RATE_LIMIT_KEY_NAMESPACE,
  RATE_LIMIT_TIMEOUT_MS,
  RATE_LIMITS,
  type RateLimitPolicy,
  UNKNOWN_CLIENT_IP,
} from "@/lib/constants/rate-limits";
import type { RateLimitResult } from "@/types/auth";

// The rate limit service: the only module that talks to Upstash. It owns the
// connection and its failure policy (fail open when unset, down or slow);
// the limits per flow live in `@/lib/constants/rate-limits`, and the wording
// for a blocked caller in `@/lib/auth/rate-limit-messages`.

// Keys are per environment, so dev and prod can't share buckets even if they
// ever point at the same database.
const KEY_PREFIX = `${RATE_LIMIT_KEY_NAMESPACE}:${process.env.VERCEL_ENV ?? process.env.NODE_ENV}:ratelimit`;

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
        timeout: RATE_LIMIT_TIMEOUT_MS,
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
  UNKNOWN_CLIENT_IP;

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

/** Forgets the built limiters, so tests can change the env between cases. */
export const resetRateLimitersForTests = () => {
  limiters = undefined;
};
