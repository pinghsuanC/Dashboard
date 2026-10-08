import { describe, expect, it } from "vitest";

import { formatBytes, formatDuration, formatLongDate } from "./format";

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

describe("link lifetime in emails and pages (R10)", () => {
  it("reads whole hours as hours, 24 hours included rather than 1 day", () => {
    expect(formatDuration(60 * 60 * 1000)).toBe("1 hour");
    expect(formatDuration(24 * 60 * 60 * 1000)).toBe("24 hours");
  });

  it("reads anything else in minutes, rounded up, at least one", () => {
    expect(formatDuration(2 * 60 * 1000)).toBe("2 minutes");
    expect(formatDuration(90 * 60 * 1000)).toBe("90 minutes");
    expect(formatDuration(61 * 1000)).toBe("2 minutes");
    expect(formatDuration(0)).toBe("1 minute");
  });
});

describe("file sizes in the upload limit and file details (F1)", () => {
  it("reads whole units without decimals", () => {
    expect(formatBytes(5 * 1024 * 1024)).toBe("5 MB");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(900)).toBe("900 B");
    expect(formatBytes(0)).toBe("0 B");
  });

  it("gives other sizes one decimal, in the largest unit that fits", () => {
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(2.25 * 1024 * 1024)).toBe("2.3 MB");
    expect(formatBytes(1023)).toBe("1023 B");
  });
});
