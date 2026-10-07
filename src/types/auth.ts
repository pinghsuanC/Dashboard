export type ChangePasswordResult = "success" | "wrong-password" | "no-password" | "error";

/**
 * The same for a new email and a taken one, so registering can't be used to
 * check whether someone has an account. No user id either: it would only
 * exist in one of the two cases.
 */
export type RegisterResult = { success: true } | { success: false; error: string; status: 500 };

export type VerifyResult = "success" | "expired" | "invalid";

export interface VerifyNotice {
  text: string;
  ok: boolean;
}

export type ResetTokenStatus = "valid" | "expired" | "invalid";

export type ResetResult = "success" | Exclude<ResetTokenStatus, "valid">;

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
