import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as registerRoute } from "@/app/api/auth/register/route";
import { signIn } from "@/auth";
import { EmailNotVerifiedError, RateLimitedError } from "@/lib/auth/auth-errors";
import { resendVerificationLink } from "@/lib/auth/email-verification";
import { requestPasswordReset, resetPassword } from "@/lib/auth/password-reset";
import { registerPasswordUser } from "@/lib/auth/register-user";
import type { RateLimitPolicy } from "@/lib/constants/rate-limits";
import { checkRateLimit } from "@/services/rate-limit";

import {
  registerWithCredentials,
  requestPasswordResetAction,
  resetPasswordAction,
  signInWithCredentials,
} from "./auth";

// Next's redirect() works by throwing; the tests read the target off the error.
class RedirectError extends Error {
  constructor(readonly url: string) {
    super(`NEXT_REDIRECT ${url}`);
  }
}

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectError(url);
  },
}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "1.1.1.1" }),
}));
// Runs the callback at once, so the test sees whether the reset was requested.
vi.mock("next/server", () => ({ after: (run: () => unknown) => run() }));
vi.mock("@/auth", () => ({ signIn: vi.fn(), signOut: vi.fn() }));
vi.mock("@/lib/auth/email-verification", () => ({ resendVerificationLink: vi.fn() }));
vi.mock("@/lib/auth/password-reset", () => ({
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
}));
vi.mock("@/lib/auth/register-user", () => ({ registerPasswordUser: vi.fn() }));
// The real messages; only the check against Upstash is faked.
vi.mock("@/services/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/rate-limit")>()),
  checkRateLimit: vi.fn(),
}));

const NOW = Date.parse("2026-10-03T12:00:00Z");
const RESET = NOW + 10 * 60_000;
const WAIT = "Too many attempts. Please try again in 10 minutes.";

/** Puts these policies over their limit; every other check passes. */
const overLimit = (...policies: RateLimitPolicy[]) =>
  vi.mocked(checkRateLimit).mockImplementation(async (policy) =>
    policies.includes(policy)
      ? { success: false, remaining: 0, reset: RESET }
      : { success: true, remaining: 1, reset: RESET },
  );

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
};

const PASSWORD = "new-password-1";
const registerForm = () =>
  form({ name: "Ada", email: "ada@example.test", password: PASSWORD, confirmPassword: PASSWORD });
const resetForm = () =>
  form({ token: "a".repeat(43), password: PASSWORD, confirmPassword: PASSWORD });

beforeEach(() => {
  vi.useFakeTimers({ now: NOW });
  vi.clearAllMocks();
  overLimit();
  vi.mocked(registerPasswordUser).mockResolvedValue({ success: true });
  vi.mocked(resetPassword).mockResolvedValue("success");
});

describe("sign-in", () => {
  it("R1: over the sign-in limit, the form toasts how long to wait", async () => {
    vi.mocked(signIn).mockRejectedValue(new RateLimitedError(RESET));

    const state = await signInWithCredentials({}, form({ email: "ada@example.test", password: PASSWORD }));

    expect(state).toEqual({ toast: WAIT });
  });

  it("R2: an unverified sign-in resends the link while under the resend limit, keyed by IP + email", async () => {
    vi.mocked(signIn).mockRejectedValue(new EmailNotVerifiedError("ada@example.test"));

    const state = await signInWithCredentials({}, form({ email: "ada@example.test", password: PASSWORD }));

    expect(resendVerificationLink).toHaveBeenCalledWith("ada@example.test");
    expect(checkRateLimit).toHaveBeenCalledWith("resendVerification", expect.any(Headers), "ada@example.test");
    expect(state.error).toMatch(/verify your email/i);
  });

  it("R3: over the resend limit, no email goes out but the answer is unchanged", async () => {
    overLimit("resendVerification");
    vi.mocked(signIn).mockRejectedValue(new EmailNotVerifiedError("ada@example.test"));

    const state = await signInWithCredentials({}, form({ email: "ada@example.test", password: PASSWORD }));

    expect(resendVerificationLink).not.toHaveBeenCalled();
    expect(state.error).toMatch(/verify your email/i);
  });
});

describe("register", () => {
  it("R4: over the limit, no account is created and the form toasts the wait", async () => {
    overLimit("register");

    await expect(registerWithCredentials({}, registerForm())).resolves.toEqual({ toast: WAIT });
    expect(registerPasswordUser).not.toHaveBeenCalled();
  });

  it("R4b: over the per-email limit (from any IP), no account is created and the form toasts the wait", async () => {
    overLimit("registerEmail");

    await expect(registerWithCredentials({}, registerForm())).resolves.toEqual({ toast: WAIT });
    expect(registerPasswordUser).not.toHaveBeenCalled();
  });

  it("R5b: counts one attempt per IP and one per email", async () => {
    await registerWithCredentials({}, registerForm()).catch(() => {});

    expect(vi.mocked(checkRateLimit).mock.calls).toEqual([
      ["register", expect.any(Headers)],
      ["registerEmail", expect.any(Headers), "ada@example.test"],
    ]);
  });

  it("R5c: a caller over the IP limit doesn't use up the email's attempts", async () => {
    overLimit("register");

    await registerWithCredentials({}, registerForm());

    expect(checkRateLimit).not.toHaveBeenCalledWith("registerEmail", expect.anything(), expect.anything());
  });

  it("R5: an invalid form doesn't use up an attempt", async () => {
    await registerWithCredentials({}, form({ email: "not-an-email" }));

    expect(checkRateLimit).not.toHaveBeenCalled();
  });

  it("R6: the API route answers 429 with the wait and a Retry-After, and creates nothing", async () => {
    overLimit("register");
    const request = new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "x-forwarded-for": "1.1.1.1" },
      body: JSON.stringify({ name: "Ada", email: "ada@example.test", password: PASSWORD, confirmPassword: PASSWORD }),
    });

    const response = await registerRoute(request);

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("600");
    expect(await response.json()).toEqual({ success: false, error: WAIT });
    expect(checkRateLimit).toHaveBeenCalledWith("register", request.headers);
    expect(registerPasswordUser).not.toHaveBeenCalled();
  });
});

describe("forgot password", () => {
  it("R7: over the limit, no reset is requested and the form toasts the wait", async () => {
    overLimit("forgotPassword");

    const state = await requestPasswordResetAction({}, form({ email: "ada@example.test" }));

    expect(state).toEqual({ toast: WAIT });
    expect(requestPasswordReset).not.toHaveBeenCalled();
  });

  it("R8: the limit is by IP alone, so being limited says nothing about the email", async () => {
    await expect(requestPasswordResetAction({}, form({ email: "ada@example.test" }))).rejects.toThrow(
      RedirectError,
    );

    expect(checkRateLimit).toHaveBeenCalledWith("forgotPassword", expect.any(Headers));
  });
});

describe("reset password", () => {
  it("R9: over the limit, the token isn't tried and the form toasts the wait", async () => {
    overLimit("resetPassword");

    await expect(resetPasswordAction({}, resetForm())).resolves.toEqual({ toast: WAIT });
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it("R10: under the limit, the reset goes through", async () => {
    await expect(resetPasswordAction({}, resetForm())).rejects.toThrow(RedirectError);
    expect(resetPassword).toHaveBeenCalled();
  });
});
