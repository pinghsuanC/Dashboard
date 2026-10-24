import { describe, expect, it } from "vitest";

import { BILLING_GRACE_MS } from "@/lib/constants/billing";

import { liveSince } from "./plan-rules";

const now = new Date("2026-05-10T12:00:00Z");

// How a `PAID` period's end is matched: `periodEnd >= liveSince(now)`.
const isLive = (periodEnd: Date) => periodEnd.getTime() >= liveSince(now).getTime();

describe("when a paid period is live (R3)", () => {
  it("is live before its end", () => {
    expect(isLive(new Date(now.getTime() + 1))).toBe(true);
  });

  it("stays live through the grace window after its end", () => {
    expect(isLive(new Date(now.getTime() - BILLING_GRACE_MS / 2))).toBe(true);
  });

  it("is live at the last instant of the grace window", () => {
    expect(isLive(new Date(now.getTime() - BILLING_GRACE_MS))).toBe(true);
  });

  it("is not live a millisecond after the grace window", () => {
    expect(isLive(new Date(now.getTime() - BILLING_GRACE_MS - 1))).toBe(false);
  });

  it("measures from the current time when none is given", () => {
    const before = Date.now();
    const since = liveSince().getTime();

    expect(since).toBeGreaterThanOrEqual(before - BILLING_GRACE_MS);
    expect(since).toBeLessThanOrEqual(Date.now() - BILLING_GRACE_MS);
  });
});
