import { describe, expect, it } from "vitest";

import { formatLongDate } from "./format";

// The run's TZ is set far from UTC in vitest.config.ts, so these fail if the
// formatter follows the machine's zone instead of pinning UTC.
describe("join date (R9)", () => {
  it("reads as month, day and year", () => {
    expect(formatLongDate(new Date("2024-01-15T09:24:00Z"))).toBe("January 15, 2024");
  });

  it("does not roll into the next day or year on a server ahead of UTC", () => {
    expect(formatLongDate(new Date("2025-12-31T23:30:00Z"))).toBe("December 31, 2025");
  });
});
