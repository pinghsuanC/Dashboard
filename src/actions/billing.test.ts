import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BillingNotConfiguredError } from "@/lib/billing/billing-errors";
import {
  BILLING_ALREADY_SUBSCRIBED,
  BILLING_NO_PORTAL,
  BILLING_UNAVAILABLE,
} from "@/lib/constants/messages/billing";
import { FIELDS_INVALID, SOMETHING_WENT_WRONG } from "@/lib/constants/messages/common";
import { requireCurrentUser, requireCurrentUserId } from "@/services/auth/session";
import { checkRateLimit } from "@/services/rate-limit";
import { fakeAdapter, paidPeriod, resetFakeBilling } from "@/test/fake-billing";
import { db, resetDb } from "@/test/fake-prisma";
import type { CurrentUser } from "@/types/session";

import { openBillingPortal, startCheckout } from "./billing";

vi.mock("@/services/auth/session", () => ({ requireCurrentUser: vi.fn(), requireCurrentUserId: vi.fn() }));
vi.mock("@/services/prisma", async () => ({ prisma: (await import("@/test/fake-prisma")).fakePrisma }));
vi.mock("@/services/billing/vendors", async () => (await import("@/test/fake-billing")).fakeVendors);
vi.mock("@/services/rate-limit", () => ({ checkRateLimit: vi.fn() }));
// The request's headers: its host decides the return links when not on Vercel.
let requestHeaders = new Headers();
vi.mock("next/headers", () => ({ headers: async () => requestHeaders }));
vi.spyOn(console, "error").mockImplementation(() => {});

const APP_URL = "https://app.test";
const signedInRequest = () =>
  new Headers({ "x-forwarded-for": "1.1.1.1", host: "app.test", "x-forwarded-proto": "https" });
const ada = { id: "ada", email: "ada@example.com", plan: "FREE", isPro: false } as CurrentUser;
const day = (n: number) => new Date(Date.UTC(2026, 0, n));

const form = (interval: string) => {
  const data = new FormData();
  data.set("interval", interval);
  return data;
};
const checkout = (interval = "MONTH") => startCheckout({}, form(interval));
const redirectedTo = (url: string) => ({ digest: expect.stringContaining(`;${url};`) });
const adasPeriods = () => db.subscriptionPeriods.filter((row) => row.userId === "ada");

beforeEach(() => {
  resetDb();
  resetFakeBilling();
  vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
  requestHeaders = signedInRequest();
  db.users.push({ id: "ada", name: "Ada", email: ada.email, passwordHash: null, createdAt: day(1) });
  vi.mocked(requireCurrentUser).mockResolvedValue(ada);
  vi.mocked(requireCurrentUserId).mockResolvedValue("ada");
  vi.mocked(checkRateLimit).mockReset().mockResolvedValue({ success: true, remaining: 1, reset: Date.now() });
});

describe("startCheckout: a new checkout (R8, R12)", () => {
  it("R8: inserts one PENDING period, starts the checkout tied to it, stores the session id and redirects there", async () => {
    await expect(checkout("YEAR")).rejects.toMatchObject(redirectedTo("https://checkout.test/period-1"));

    expect(adasPeriods()).toEqual([
      expect.objectContaining({
        id: "period-1",
        status: "PENDING",
        vendor: "STRIPE",
        interval: "YEAR",
        stripeCheckoutSessionId: "cs_period-1",
      }),
    ]);
    // A pending row has no dates: it grants nothing.
    expect(adasPeriods()[0].periodEnd ?? null).toBeNull();
    expect(fakeAdapter.createCheckout).toHaveBeenCalledOnce();
    expect(fakeAdapter.createCheckout.mock.calls[0][0]).toMatchObject({ periodId: "period-1", userId: "ada", interval: "YEAR" });
  });

  it("R12: returns to settings on the app's own address with a success or canceled flag, and no id in either", async () => {
    await expect(checkout()).rejects.toMatchObject(redirectedTo("https://checkout.test/period-1"));

    const { successUrl, cancelUrl } = fakeAdapter.createCheckout.mock.calls[0][0];
    expect(successUrl).toBe(`${APP_URL}/settings?billing=success`);
    expect(cancelUrl).toBe(`${APP_URL}/settings?billing=canceled`);
  });

  it("an interval that isn't MONTH or YEAR is refused, and nothing is written", async () => {
    expect(await checkout("WEEK")).toEqual({ toast: FIELDS_INVALID });
    expect(adasPeriods()).toEqual([]);
    expect(fakeAdapter.createCheckout).not.toHaveBeenCalled();
  });

  it("R8: a signed-out user is redirected to sign in, and nothing is written", async () => {
    vi.mocked(requireCurrentUser).mockImplementation(() => redirect("/sign-in"));

    await expect(checkout()).rejects.toMatchObject(redirectedTo("/sign-in"));
    expect(db.subscriptionPeriods).toEqual([]);
  });

  it("a vendor failure answers a retry message; the row is left without a session id", async () => {
    fakeAdapter.createCheckout.mockRejectedValue(new Error("Stripe down"));

    expect(await checkout()).toEqual({ toast: SOMETHING_WENT_WRONG });
    expect(adasPeriods()).toEqual([expect.objectContaining({ status: "PENDING" })]);
    expect(adasPeriods()[0].stripeCheckoutSessionId ?? null).toBeNull();
  });
});

describe("startCheckout: the customer (R9)", () => {
  it("a new user goes by email: no customer id", async () => {
    await expect(checkout()).rejects.toMatchObject(redirectedTo("https://checkout.test/period-1"));

    expect(fakeAdapter.createCheckout.mock.calls[0][0]).toMatchObject({ email: "ada@example.com", customerId: null });
  });

  it("a returning customer goes by the customer id of their latest paid row", async () => {
    db.subscriptionPeriods.push(
      { id: "old", userId: "ada", vendor: "STRIPE", vendorCustomerId: "cus_old", interval: "MONTH", periodEnd: day(2), createdAt: day(1) },
      { id: "newer", userId: "ada", vendor: "STRIPE", vendorCustomerId: "cus_new", interval: "MONTH", periodEnd: day(3), createdAt: day(2) },
      // Another user's customer is never used.
      { id: "bobs", userId: "bob", vendor: "STRIPE", vendorCustomerId: "cus_bob", interval: "MONTH", periodEnd: day(4), createdAt: day(3) },
    );

    await expect(checkout()).rejects.toMatchObject({ digest: expect.stringContaining("NEXT_REDIRECT") });

    expect(fakeAdapter.createCheckout.mock.calls[0][0]).toMatchObject({ customerId: "cus_new" });
    expect(fakeAdapter.hasOpenSubscription).toHaveBeenCalledWith("cus_new");
  });

  it("a granted period is no customer", async () => {
    db.subscriptionPeriods.push({ id: "trial", userId: "ada", vendor: null, interval: "MONTH", periodEnd: day(2), createdAt: day(1) });

    await expect(checkout()).rejects.toMatchObject({ digest: expect.stringContaining("NEXT_REDIRECT") });

    expect(fakeAdapter.createCheckout.mock.calls[0][0]).toMatchObject({ customerId: null });
    expect(fakeAdapter.hasOpenSubscription).not.toHaveBeenCalled();
  });
});

describe("startCheckout: an earlier pending checkout (R10)", () => {
  beforeEach(() => {
    db.subscriptionPeriods.push({
      id: "pending",
      userId: "ada",
      status: "PENDING",
      vendor: "STRIPE",
      interval: "MONTH",
      stripeCheckoutSessionId: "cs_open",
      createdAt: day(1),
    });
  });

  it("an open one is reused: the user goes back to it, and nothing is inserted", async () => {
    fakeAdapter.fetchCheckout.mockResolvedValue({ state: "open", url: "https://checkout.test/cs_open" });

    await expect(checkout()).rejects.toMatchObject(redirectedTo("https://checkout.test/cs_open"));
    expect(fakeAdapter.fetchCheckout).toHaveBeenCalledWith("cs_open");
    expect(adasPeriods()).toHaveLength(1);
    expect(fakeAdapter.createCheckout).not.toHaveBeenCalled();
  });

  it("an expired one is marked EXPIRED and a new checkout started", async () => {
    fakeAdapter.fetchCheckout.mockResolvedValue({ state: "expired" });

    await expect(checkout()).rejects.toMatchObject({ digest: expect.stringContaining("NEXT_REDIRECT") });
    expect(adasPeriods()).toEqual([
      expect.objectContaining({ id: "pending", status: "EXPIRED" }),
      expect.objectContaining({ status: "PENDING", stripeCheckoutSessionId: expect.stringMatching(/^cs_/) }),
    ]);
  });

  it("one already paid is settled, and no second checkout is started", async () => {
    fakeAdapter.fetchCheckout.mockResolvedValue({ state: "paid", period: paidPeriod() });

    expect(await checkout()).toEqual({ toast: BILLING_ALREADY_SUBSCRIBED });
    expect(adasPeriods()).toEqual([expect.objectContaining({ id: "pending", status: "PAID", vendorCustomerId: "cus_ada" })]);
    expect(fakeAdapter.createCheckout).not.toHaveBeenCalled();
  });

  it("a pending row without a session id (its checkout never started) is skipped", async () => {
    db.subscriptionPeriods[0].stripeCheckoutSessionId = null;

    await expect(checkout()).rejects.toMatchObject({ digest: expect.stringContaining("NEXT_REDIRECT") });
    expect(fakeAdapter.fetchCheckout).not.toHaveBeenCalled();
    expect(adasPeriods()).toHaveLength(2);
  });

  it("a newer pending row without a session id doesn't hide the open one", async () => {
    db.subscriptionPeriods.push({ id: "failed", userId: "ada", status: "PENDING", vendor: "STRIPE", interval: "MONTH", createdAt: day(2) });
    fakeAdapter.fetchCheckout.mockResolvedValue({ state: "open", url: "https://checkout.test/cs_open" });

    await expect(checkout()).rejects.toMatchObject(redirectedTo("https://checkout.test/cs_open"));
    expect(adasPeriods()).toHaveLength(2);
  });
});

describe("startCheckout: refusals (R11)", () => {
  it("a returning customer with an open subscription at the vendor is refused, and nothing is written", async () => {
    db.subscriptionPeriods.push({ id: "old", userId: "ada", vendor: "STRIPE", vendorCustomerId: "cus_old", interval: "MONTH", periodEnd: day(2), createdAt: day(1) });
    fakeAdapter.hasOpenSubscription.mockResolvedValue(true);

    expect(await checkout()).toEqual({ toast: BILLING_ALREADY_SUBSCRIBED });
    expect(adasPeriods()).toHaveLength(1);
    expect(fakeAdapter.createCheckout).not.toHaveBeenCalled();
  });

  it("a Pro user is sent to settings, and the vendor isn't asked", async () => {
    vi.mocked(requireCurrentUser).mockResolvedValue({ ...ada, plan: "PRO", isPro: true });

    await expect(checkout()).rejects.toMatchObject(redirectedTo("/settings"));
    expect(fakeAdapter.createCheckout).not.toHaveBeenCalled();
    expect(checkRateLimit).not.toHaveBeenCalled();
  });

  it("over the checkout rate limit, keyed by the user alone, answers with the wait; nothing is written", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ success: false, remaining: 0, reset: Date.now() + 60_000 });

    expect(await checkout()).toEqual({ toast: expect.stringContaining("Too many attempts") });
    expect(checkRateLimit).toHaveBeenCalledWith("checkout", expect.any(Headers), "ada");
    expect(db.subscriptionPeriods).toEqual([]);
    expect(fakeAdapter.createCheckout).not.toHaveBeenCalled();
  });

  it("missing vendor settings answer BILLING_UNAVAILABLE, and nothing is written", async () => {
    fakeAdapter.assertConfigured.mockImplementation(() => {
      throw new BillingNotConfiguredError(["STRIPE_SECRET_KEY"]);
    });

    expect(await checkout()).toEqual({ toast: BILLING_UNAVAILABLE });
    expect(db.subscriptionPeriods).toEqual([]);
  });

  it("no address for the app (not on Vercel, no request host) answers the same, and nothing is written", async () => {
    requestHeaders = new Headers();

    expect(await checkout()).toEqual({ toast: BILLING_UNAVAILABLE });
    expect(db.subscriptionPeriods).toEqual([]);
    expect(fakeAdapter.createCheckout).not.toHaveBeenCalled();
  });
});

describe("openBillingPortal", () => {
  it("sends a customer to the vendor's portal for their newest customer, returning to settings", async () => {
    db.subscriptionPeriods.push(
      { id: "old", userId: "ada", vendor: "STRIPE", vendorCustomerId: "cus_old", interval: "MONTH", periodEnd: day(2), createdAt: day(1) },
      { id: "new", userId: "ada", vendor: "STRIPE", vendorCustomerId: "cus_new", interval: "MONTH", periodEnd: day(3), createdAt: day(2) },
    );

    await expect(openBillingPortal()).rejects.toMatchObject(redirectedTo("https://portal.test/session"));
    expect(fakeAdapter.createPortalLink).toHaveBeenCalledWith("cus_new", `${APP_URL}/settings`);
  });

  it("a user who never paid has no portal; another user's customer is never used", async () => {
    db.subscriptionPeriods.push({ id: "bobs", userId: "bob", vendor: "STRIPE", vendorCustomerId: "cus_bob", interval: "MONTH", periodEnd: day(2), createdAt: day(1) });

    expect(await openBillingPortal()).toEqual({ toast: BILLING_NO_PORTAL });
    expect(fakeAdapter.createPortalLink).not.toHaveBeenCalled();
  });

  it("a vendor failure answers a retry message", async () => {
    db.subscriptionPeriods.push({ id: "p", userId: "ada", vendor: "STRIPE", vendorCustomerId: "cus_ada", interval: "MONTH", periodEnd: day(2), createdAt: day(1) });
    fakeAdapter.createPortalLink.mockRejectedValue(new Error("Stripe down"));

    expect(await openBillingPortal()).toEqual({ toast: SOMETHING_WENT_WRONG });
  });

  it("no address for the app answers BILLING_UNAVAILABLE", async () => {
    db.subscriptionPeriods.push({ id: "p", userId: "ada", vendor: "STRIPE", vendorCustomerId: "cus_ada", interval: "MONTH", periodEnd: day(2), createdAt: day(1) });
    requestHeaders = new Headers();

    expect(await openBillingPortal()).toEqual({ toast: BILLING_UNAVAILABLE });
  });
});

describe("return links follow where the app runs", () => {
  it("on Vercel, checkout returns to the production domain", async () => {
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "devstash.vercel.app");

    await expect(checkout()).rejects.toMatchObject({ digest: expect.stringContaining("NEXT_REDIRECT") });

    expect(fakeAdapter.createCheckout.mock.calls[0][0].successUrl).toBe("https://devstash.vercel.app/settings?billing=success");
  });

  it("elsewhere, checkout returns to the host the user came from", async () => {
    requestHeaders = new Headers({ host: "localhost:3000" });

    await expect(checkout()).rejects.toMatchObject({ digest: expect.stringContaining("NEXT_REDIRECT") });

    expect(fakeAdapter.createCheckout.mock.calls[0][0].cancelUrl).toBe("http://localhost:3000/settings?billing=canceled");
  });
});
