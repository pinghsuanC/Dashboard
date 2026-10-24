import { beforeEach, describe, expect, it, vi } from "vitest";

import { auth } from "@/auth";
import { BILLING_GRACE_MS } from "@/lib/constants/billing";
import { DAY_MS } from "@/lib/constants/time";
import { db, resetDb } from "@/test/fake-prisma";

import { getCurrentUser, redirectIfSignedIn, requireCurrentUserId } from "./session";

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
// The JWT: the user id, plus the session version stamped at sign-in.
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/services/prisma", async () => ({ prisma: (await import("@/test/fake-prisma")).fakePrisma }));

const withToken = (userId: string | null) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- auth() is overloaded; the session shape is all that matters
  vi.mocked(auth as any).mockResolvedValue(userId ? { user: { id: userId } } : null);

/** Where a call redirected to (path only), or null if it returned normally. */
const redirectPathOf = async (run: () => Promise<unknown>) => {
  const error = await run().then(
    () => null,
    (thrown: unknown) => thrown,
  );
  if (error === null) return null;
  expect(error).toBeInstanceOf(RedirectError);
  return new URL((error as RedirectError).url, "http://app.test").pathname;
};

const createdAt = new Date("2025-03-04T05:06:07Z");

const fromNow = (ms: number) => new Date(Date.now() + ms);

beforeEach(() => {
  resetDb();
  db.users.push(
    {
      id: "ada",
      name: "Ada",
      email: "ada@example.test",
      image: null,
      passwordHash: "$2b$hash",
      editorPreferences: { fontSize: 16, theme: "monokai" },
      createdAt,
    },
    {
      id: "octo",
      name: null,
      email: "octo@example.test",
      image: "https://avatars.example/octo.png",
      passwordHash: null,
      createdAt,
    },
  );
  // Ada pays through Stripe; Octo has never paid.
  db.subscriptionPeriods.push({
    id: "ada-paid",
    userId: "ada",
    status: "PAID",
    vendor: "STRIPE",
    vendorCustomerId: "cus_secret",
    vendorSubscriptionId: "sub_secret",
    stripeCheckoutSessionId: "cs_secret",
    stripePriceId: "price_monthly",
    interval: "MONTH",
    periodStart: fromNow(-10 * DAY_MS),
    periodEnd: fromNow(20 * DAY_MS),
  });
});

describe("who is signed in (A1)", () => {
  it("gives the user for a valid token whose user exists", async () => {
    withToken("ada");

    expect((await getCurrentUser())?.id).toBe("ada");
  });

  it("gives null without a token", async () => {
    withToken(null);

    expect(await getCurrentUser()).toBeNull();
  });

  it("gives null for a valid token whose user was deleted", async () => {
    withToken("ghost");

    expect(await getCurrentUser()).toBeNull();
  });
});

describe("the signed-in user's profile (R8)", () => {
  it("returns the profile with its join date and Pro and password flags", async () => {
    withToken("ada");

    expect(await getCurrentUser()).toEqual({
      id: "ada",
      name: "Ada",
      email: "ada@example.test",
      image: null,
      plan: "PRO",
      isPro: true,
      editorPreferences: { fontSize: 16, tabSize: 2, wordWrap: true, minimap: false, theme: "monokai" },
      createdAt,
      hasPassword: true,
    });
  });

  it("says a GitHub-only free user has no password and is not Pro", async () => {
    withToken("octo");

    const user = await getCurrentUser();

    expect(user?.hasPassword).toBe(false);
    expect(user?.isPro).toBe(false);
  });

  it("never hands the password hash or billing ids to the page (R7)", async () => {
    withToken("ada");

    const serialized = JSON.stringify(await getCurrentUser());

    expect(serialized).not.toContain("$2b$hash");
    expect(serialized).not.toContain("cus_secret");
    expect(serialized).not.toContain("sub_secret");
    expect(serialized).not.toContain("cs_secret");
    expect(serialized).not.toContain("price_monthly");
    expect(serialized).not.toContain("ada-paid");
  });
});

describe("the plan, from the user's periods", () => {
  const period = (fields: Partial<(typeof db.subscriptionPeriods)[number]>) =>
    db.subscriptionPeriods.push({ id: `octo-${db.subscriptionPeriods.length}`, userId: "octo", interval: "MONTH", ...fields });

  const planOf = async () => {
    withToken("octo");
    const user = await getCurrentUser();
    return { plan: user?.plan, isPro: user?.isPro };
  };

  const FREE = { plan: "FREE", isPro: false };
  const PRO = { plan: "PRO", isPro: true };

  it("R3: a user with no periods is Free, whatever another user has", async () => {
    expect(await planOf()).toEqual(FREE);
  });

  it("R2: a pending checkout grants nothing", async () => {
    period({ status: "PENDING", vendor: "STRIPE", stripeCheckoutSessionId: "cs_open" });

    expect(await planOf()).toEqual(FREE);
  });

  it("R2: a pending row grants nothing even with dates in range", async () => {
    period({ status: "PENDING", vendor: "STRIPE", periodStart: fromNow(-DAY_MS), periodEnd: fromNow(30 * DAY_MS) });

    expect(await planOf()).toEqual(FREE);
  });

  it("R2: an abandoned checkout grants nothing", async () => {
    period({ status: "EXPIRED", vendor: "STRIPE", periodStart: fromNow(-DAY_MS), periodEnd: fromNow(30 * DAY_MS) });

    expect(await planOf()).toEqual(FREE);
  });

  it("R3: a paid period that hasn't ended gives Pro", async () => {
    period({ status: "PAID", vendor: "STRIPE", periodStart: fromNow(-DAY_MS), periodEnd: fromNow(30 * DAY_MS) });

    expect(await planOf()).toEqual(PRO);
  });

  it("R3: a paid period stays Pro inside the grace window after its end", async () => {
    period({ status: "PAID", vendor: "STRIPE", periodEnd: fromNow(-BILLING_GRACE_MS / 2) });

    expect(await planOf()).toEqual(PRO);
  });

  it("R3: a paid period past its end and grace gives Free", async () => {
    period({ status: "PAID", vendor: "STRIPE", periodEnd: fromNow(-BILLING_GRACE_MS - DAY_MS) });

    expect(await planOf()).toEqual(FREE);
  });

  it("R3: a revoked paid period gives Free, even before its end", async () => {
    period({ status: "PAID", vendor: "STRIPE", periodEnd: fromNow(30 * DAY_MS), revokedAt: fromNow(-DAY_MS) });

    expect(await planOf()).toEqual(FREE);
  });

  it("R3: one live period is enough, whatever else the user has", async () => {
    period({ status: "PAID", vendor: "STRIPE", periodEnd: fromNow(-60 * DAY_MS) });
    period({ status: "EXPIRED", vendor: "STRIPE" });
    period({ status: "PAID", vendor: "STRIPE", periodEnd: fromNow(10 * DAY_MS) });

    expect(await planOf()).toEqual(PRO);
  });

  it("R4: a granted period (no vendor) gives Pro while live", async () => {
    period({ status: "PAID", vendor: null, periodStart: fromNow(-DAY_MS), periodEnd: fromNow(7 * DAY_MS) });

    expect(await planOf()).toEqual(PRO);
  });

  it("R4: a granted period gives Free once it has ended", async () => {
    period({ status: "PAID", vendor: null, periodEnd: fromNow(-BILLING_GRACE_MS - DAY_MS) });

    expect(await planOf()).toEqual(FREE);
  });
});

describe("the profile's editor preferences (EP3)", () => {
  it("gives every default to a user who never saved any", async () => {
    withToken("octo");

    expect((await getCurrentUser())?.editorPreferences).toEqual({
      fontSize: 12,
      tabSize: 2,
      wordWrap: true,
      minimap: false,
      theme: "vs-dark",
    });
  });

  it("keeps the saved fields and fills the rest with defaults", async () => {
    withToken("ada");

    expect((await getCurrentUser())?.editorPreferences).toEqual({
      fontSize: 16,
      tabSize: 2,
      wordWrap: true,
      minimap: false,
      theme: "monokai",
    });
  });
});

describe("guard for queries and actions (A2)", () => {
  it("returns the id when signed in", async () => {
    withToken("ada");

    expect(await requireCurrentUserId()).toBe("ada");
  });

  it("sends a signed-out request to sign-in", async () => {
    withToken(null);

    expect(await redirectPathOf(requireCurrentUserId)).toBe("/sign-in");
  });

  it("sends a deleted user's token to sign-in", async () => {
    withToken("ghost");

    expect(await redirectPathOf(requireCurrentUserId)).toBe("/sign-in");
  });
});

describe("auth pages for someone already signed in (A3)", () => {
  it("sends a signed-in visitor into the app, to the dashboard by default", async () => {
    withToken("ada");

    expect(await redirectPathOf(() => redirectIfSignedIn())).toBe("/dashboard");
  });

  it("sends them to the page they asked for when there is one", async () => {
    withToken("ada");

    expect(await redirectPathOf(() => redirectIfSignedIn("/profile"))).toBe("/profile");
  });

  it("leaves a signed-out visitor on the page", async () => {
    withToken(null);

    expect(await redirectPathOf(() => redirectIfSignedIn())).toBeNull();
  });

  it("leaves a deleted user's token on the page, so it can't loop with the app", async () => {
    withToken("ghost");

    expect(await redirectPathOf(() => redirectIfSignedIn())).toBeNull();
  });
});

describe("sessions revoked by a password change or reset (M1)", () => {
  const withVersion = (sessionVersion: number | undefined) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- auth() is overloaded; the session shape is all that matters
    vi.mocked(auth as any).mockResolvedValue({ user: { id: "ada" }, sessionVersion });

  beforeEach(() => {
    db.users[0].sessionVersion = 2;
  });

  it("signs in a session issued at the user's current version", async () => {
    withVersion(2);

    expect((await getCurrentUser())?.id).toBe("ada");
  });

  it("signs out a session issued before the last change or reset", async () => {
    withVersion(1);

    expect(await getCurrentUser()).toBeNull();
    expect(await redirectPathOf(requireCurrentUserId)).toBe("/sign-in");
  });

  it("lets a cookie from before versions existed through until the first bump", async () => {
    withVersion(undefined);
    db.users[0].sessionVersion = 0;
    expect((await getCurrentUser())?.id).toBe("ada");

    db.users[0].sessionVersion = 1;
    expect(await getCurrentUser()).toBeNull();
  });

  it("keeps the version out of the profile handed to the page", async () => {
    withVersion(2);

    expect(await getCurrentUser()).not.toHaveProperty("sessionVersion");
  });
});
