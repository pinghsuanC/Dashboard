import { checkRateLimit } from "@/services/rate-limit";
import type { RateLimitResult } from "@/types/auth";

/**
 * Register's two limits, shared by the register action and API route: per IP
 * (bulk sign-ups from one network) and per email from any IP (taken-email
 * notices to one address). The email limit is only counted once the IP one
 * passes, so a caller already blocked can't use up someone else's email.
 */
export const checkRegisterRateLimit = async (headers: Headers, email: string): Promise<RateLimitResult> => {
  const byIp = await checkRateLimit("register", headers);
  if (!byIp.success) return byIp;
  return checkRateLimit("registerEmail", headers, email);
};
