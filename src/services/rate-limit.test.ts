import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { checkRateLimit, clientIp, resetRateLimitersForTests } from "./rate-limit";

// An in-memory sliding window in place of Upstash: each key keeps the times of
// its allowed hits, and a hit is allowed while fewer than `limit` fall inside
// the window. Keys include the prefix, so separate policies get separate buckets.
const fake = vi.hoisted(() => ({ hits: new Map<string, number[]>(), down: false }));

vi.mock("@upstash/redis", () => ({ Redis: class {} }));
vi.mock("@upstash/ratelimit", () => {
  const UNITS: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000 };
  const toMs = (window: string) => {
    const [amount, unit] = window.split(" ");
    return Number(amount) * UNITS[unit];
  };

  class Ratelimit {
    static slidingWindow = (limit: number, window: string) => ({ limit, ms: toMs(window) });

    constructor(
      private readonly opts: { limiter: { limit: number; ms: number }; prefix: string },
    ) {}

    async limit(key: string) {
      if (fake.down) throw new Error("Upstash unreachable");
      const { limit, ms } = this.opts.limiter;
      const now = Date.now();
      const id = `${this.opts.prefix}:${key}`;
      const live = (fake.hits.get(id) ?? []).filter((t) => t > now - ms);
      const success = live.length < limit;
      if (success) live.push(now);
      fake.hits.set(id, live);
      return { success, remaining: Math.max(0, limit - live.length), reset: live[0] + ms };
    }
  }
  return { Ratelimit };
});

const fromIp = (ip: string) => new Headers({ "x-forwarded-for": ip });

/** Runs `n` checks and returns how many were allowed. */
const attempts = async (n: number, run: () => ReturnType<typeof checkRateLimit>) => {
  let allowed = 0;
  for (let i = 0; i < n; i++) if ((await run()).success) allowed++;
  return allowed;
};

beforeEach(() => {
  vi.useFakeTimers({ now: new Date("2026-10-03T12:00:00Z") });
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://fake.upstash.test");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "fake-token");
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  fake.hits.clear();
  fake.down = false;
  resetRateLimitersForTests();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("rate limits per flow", () => {
  it("R1: each flow allows its limit within the window, then blocks", async () => {
    const ip = fromIp("1.1.1.1");
    expect(await attempts(7, () => checkRateLimit("signIn", ip, "ada@example.test"))).toBe(5);
    expect(await attempts(5, () => checkRateLimit("register", ip))).toBe(3);
    expect(await attempts(5, () => checkRateLimit("forgotPassword", ip))).toBe(3);
    expect(await attempts(7, () => checkRateLimit("resetPassword", ip))).toBe(5);
    expect(await attempts(5, () => checkRateLimit("resendVerification", ip, "ada@example.test"))).toBe(3);
  });

  it("R2: a blocked caller gets through again once the window has passed, and not before", async () => {
    const ip = fromIp("1.1.1.1");
    await attempts(3, () => checkRateLimit("register", ip));

    vi.advanceTimersByTime(59 * 60_000);
    expect((await checkRateLimit("register", ip)).success).toBe(false);

    vi.advanceTimersByTime(60_000 + 1);
    expect((await checkRateLimit("register", ip)).success).toBe(true);
  });

  it("R3: a blocked check reports when the window frees up", async () => {
    const ip = fromIp("1.1.1.1");
    await attempts(5, () => checkRateLimit("resetPassword", ip));

    const blocked = await checkRateLimit("resetPassword", ip);
    expect(blocked).toMatchObject({ success: false, remaining: 0 });
    expect(blocked.reset).toBe(Date.now() + 15 * 60_000);
  });
});

describe("keying", () => {
  it("R4: sign-in is keyed by IP + email, so another email or IP has its own bucket", async () => {
    await attempts(5, () => checkRateLimit("signIn", fromIp("1.1.1.1"), "ada@example.test"));

    expect((await checkRateLimit("signIn", fromIp("1.1.1.1"), "ada@example.test")).success).toBe(false);
    expect((await checkRateLimit("signIn", fromIp("1.1.1.1"), "bob@example.test")).success).toBe(true);
    expect((await checkRateLimit("signIn", fromIp("2.2.2.2"), "ada@example.test")).success).toBe(true);
  });

  it("R5: changing the email's case or padding it doesn't get a fresh bucket", async () => {
    await attempts(5, () => checkRateLimit("signIn", fromIp("1.1.1.1"), "ada@example.test"));

    expect((await checkRateLimit("signIn", fromIp("1.1.1.1"), "  ADA@Example.TEST ")).success).toBe(false);
  });

  it("R6: register is keyed by IP alone, and flows don't share buckets", async () => {
    await attempts(3, () => checkRateLimit("register", fromIp("1.1.1.1")));

    expect((await checkRateLimit("register", fromIp("1.1.1.1"))).success).toBe(false);
    expect((await checkRateLimit("register", fromIp("2.2.2.2"))).success).toBe(true);
    expect((await checkRateLimit("forgotPassword", fromIp("1.1.1.1"))).success).toBe(true);
  });

  it("R7: the IP is the first x-forwarded-for entry, else x-real-ip", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": " 1.1.1.1 , 10.0.0.1" }))).toBe("1.1.1.1");
    expect(clientIp(new Headers({ "x-real-ip": "2.2.2.2" }))).toBe("2.2.2.2");
    expect(clientIp(new Headers({ "x-forwarded-for": "3.3.3.3", "x-real-ip": "2.2.2.2" }))).toBe("3.3.3.3");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});

describe("failing open", () => {
  it("R8: with Upstash down, every request is allowed", async () => {
    fake.down = true;

    expect(await attempts(10, () => checkRateLimit("register", fromIp("1.1.1.1")))).toBe(10);
  });

  it("R9: with the Upstash env unset, every request is allowed", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");

    expect(await attempts(10, () => checkRateLimit("register", fromIp("1.1.1.1")))).toBe(10);
  });
});
