import { describe, expect, it } from "vitest";

import { rateLimitMessage, retryAfterSeconds } from "./rate-limit-messages";

describe("telling the user", () => {
  const now = Date.parse("2026-10-03T12:00:00Z");

  it("R10: the message rounds the wait up to whole minutes, at least one", () => {
    expect(rateLimitMessage(now + 14 * 60_000 + 1, now)).toBe(
      "Too many attempts. Please try again in 15 minutes.",
    );
    expect(rateLimitMessage(now + 5_000, now)).toBe("Too many attempts. Please try again in 1 minute.");
    expect(rateLimitMessage(now - 5_000, now)).toBe("Too many attempts. Please try again in 1 minute.");
  });

  it("R11: Retry-After is the wait in whole seconds, rounded up, at least one", () => {
    expect(retryAfterSeconds(now + 90_500, now)).toBe(91);
    expect(retryAfterSeconds(now, now)).toBe(1);
  });
});
