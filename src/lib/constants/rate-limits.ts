import type { Duration } from "@upstash/ratelimit";

/** One sliding-window policy per auth flow. */
export const RATE_LIMITS = {
  signIn: { limit: 5, window: "15 m" },
  register: { limit: 3, window: "1 h" },
  forgotPassword: { limit: 3, window: "1 h" },
  resetPassword: { limit: 5, window: "15 m" },
  resendVerification: { limit: 3, window: "15 m" },
} as const satisfies Record<string, { limit: number; window: Duration }>;

export type RateLimitPolicy = keyof typeof RATE_LIMITS;

/**
 * How long a check may wait on Upstash before the request goes through
 * anyway. Ratelimit answers `success: true` when it times out.
 */
export const RATE_LIMIT_TIMEOUT_MS = 1500;

/**
 * First part of every Upstash key; the environment and policy follow. Not the
 * brand name on purpose: renaming it would reset every live bucket.
 */
export const RATE_LIMIT_KEY_NAMESPACE = "devstash";

/**
 * The key when a request carries no IP header. Every such request shares this
 * one bucket. Vercel and `next dev` always send the headers; a host that
 * doesn't would put all its users in one bucket, so check before moving hosts.
 */
export const UNKNOWN_CLIENT_IP = "unknown";
