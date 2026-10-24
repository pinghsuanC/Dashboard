import Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { stripeBilling } from "@/services/billing/stripe";
import { fakeAdapter, paidPeriod, resetFakeBilling } from "@/test/fake-billing";
import { db, resetDb } from "@/test/fake-prisma";

import { POST } from "./route";

vi.mock("@/services/prisma", async () => ({ prisma: (await import("@/test/fake-prisma")).fakePrisma }));
vi.mock("@/services/billing/vendors", async () => (await import("@/test/fake-billing")).fakeVendors);
const log = vi.spyOn(console, "error").mockImplementation(() => {});

const SECRET = "whsec_route_test";
const day = (n: number) => new Date(Date.UTC(2026, 0, n));

// Bodies signed as Stripe signs them; the real adapter verifies them.
const signer = new Stripe("sk_test_signing");
const send = (event: object, { vendor = "stripe", secret = SECRET, signature }: { vendor?: string; secret?: string; signature?: string | null } = {}) => {
  const payload = JSON.stringify(event);
  const header = signature === undefined ? signer.webhooks.generateTestHeaderString({ payload, secret }) : signature;
  const headers = new Headers({ "content-type": "application/json" });
  if (header !== null) headers.set("stripe-signature", header);
  return POST(new Request(`https://app.test/api/billing/${vendor}/webhook`, { method: "POST", body: payload, headers }), {
    params: Promise.resolve({ vendor }),
  });
};

const session = (overrides: object = {}) => ({
  id: "cs_ada",
  object: "checkout.session",
  client_reference_id: "pending-ada",
  subscription: "sub_ada",
  payment_status: "paid",
  ...overrides,
});
const event = (type: string, object: object) => ({ id: "evt_1", object: "event", type, data: { object } });
const completed = (overrides: object = {}) => event("checkout.session.completed", session(overrides));
const expired = (overrides: object = {}) => event("checkout.session.expired", session({ subscription: null, payment_status: "unpaid", ...overrides }));

const row = (id: string) => db.subscriptionPeriods.find((period) => period.id === id);

beforeEach(() => {
  resetDb();
  resetFakeBilling();
  log.mockClear();
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_123");
  vi.stubEnv("STRIPE_PRICE_ID_MONTHLY", "price_month");
  vi.stubEnv("STRIPE_PRICE_ID_YEARLY", "price_year");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", SECRET);
  // Verification is the real adapter's; everything that would reach Stripe is faked.
  fakeAdapter.parseWebhook.mockImplementation((body: string, headers: Headers) => stripeBilling.parseWebhook(body, headers));
  fakeAdapter.fetchCheckout.mockResolvedValue({ state: "paid", period: paidPeriod() });
  db.users.push({ id: "ada", name: "Ada", email: "ada@example.com", passwordHash: null, createdAt: day(1) });
  db.subscriptionPeriods.push({
    id: "pending-ada",
    userId: "ada",
    status: "PENDING",
    vendor: "STRIPE",
    interval: "MONTH",
    stripeCheckoutSessionId: "cs_ada",
    createdAt: day(1),
  });
});

describe("the route and its signature (R13)", () => {
  it("an unknown vendor segment is 404, and nothing is read or written", async () => {
    const response = await send(completed(), { vendor: "paypal" });

    expect(response.status).toBe(404);
    expect(fakeAdapter.parseWebhook).not.toHaveBeenCalled();
    expect(row("pending-ada")?.status).toBe("PENDING");
  });

  it("a missing signature is 400, and nothing is written or asked of Stripe", async () => {
    const response = await send(completed(), { signature: null });

    expect(response.status).toBe(400);
    expect(row("pending-ada")?.status).toBe("PENDING");
    expect(fakeAdapter.fetchCheckout).not.toHaveBeenCalled();
  });

  it("a body signed with another secret is 400, and nothing is written", async () => {
    const response = await send(completed(), { secret: "whsec_attacker" });

    expect(response.status).toBe(400);
    expect(row("pending-ada")?.status).toBe("PENDING");
    expect(fakeAdapter.cancelSubscription).not.toHaveBeenCalled();
  });

  it("verifies the raw body as sent", async () => {
    await send(completed());

    const [body] = fakeAdapter.parseWebhook.mock.calls[0];
    expect(body).toBe(JSON.stringify(completed()));
  });

  it("a missing webhook secret is 500, so Stripe retries once it's set", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");

    expect((await send(completed())).status).toBe(500);
    expect(row("pending-ada")?.status).toBe("PENDING");
  });
});

describe("checkout.session.completed (R14)", () => {
  it("marks the matching pending period PAID with Stripe's customer, subscription, price, interval and dates", async () => {
    const period = paidPeriod({ interval: "YEAR", stripePriceId: "price_year" });
    fakeAdapter.fetchCheckout.mockResolvedValue({ state: "paid", period });

    expect((await send(completed())).status).toBe(200);
    expect(fakeAdapter.fetchCheckout).toHaveBeenCalledWith("cs_ada");
    expect(row("pending-ada")).toMatchObject({
      status: "PAID",
      vendorCustomerId: "cus_ada",
      vendorSubscriptionId: "sub_ada",
      stripePriceId: "price_year",
      interval: "YEAR",
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
    });
    expect(fakeAdapter.cancelSubscription).not.toHaveBeenCalled();
  });

  it("a duplicated or retried event changes the row once, and cancels nothing", async () => {
    await send(completed());
    const settled = { ...row("pending-ada") };
    fakeAdapter.fetchCheckout.mockResolvedValue({ state: "paid", period: paidPeriod({ periodEnd: day(99) }) });

    expect((await send(completed())).status).toBe(200);
    expect(row("pending-ada")).toEqual(settled);
    expect(fakeAdapter.cancelSubscription).not.toHaveBeenCalled();
  });

  it("a session id that doesn't match the period's stored one settles nothing, and the subscription is cancelled", async () => {
    db.subscriptionPeriods.push({ id: "other", userId: "ada", status: "PENDING", vendor: "STRIPE", interval: "MONTH", stripeCheckoutSessionId: "cs_other", createdAt: day(1) });

    // The reference names Ada's pending period, but the session is another one.
    expect((await send(completed({ id: "cs_other" }))).status).toBe(200);
    expect(row("pending-ada")?.status).toBe("PENDING");
    expect(row("other")?.status).toBe("PENDING");
    expect(fakeAdapter.cancelSubscription).toHaveBeenCalledWith("sub_ada");
  });

  it("a payment still in progress (async methods) settles nothing yet", async () => {
    expect((await send(completed({ payment_status: "unpaid" }))).status).toBe(200);
    expect(row("pending-ada")?.status).toBe("PENDING");
    expect(fakeAdapter.fetchCheckout).not.toHaveBeenCalled();
  });

  it("Stripe saying the session isn't paid after all settles nothing", async () => {
    fakeAdapter.fetchCheckout.mockResolvedValue({ state: "open", url: null });

    expect((await send(completed())).status).toBe(200);
    expect(row("pending-ada")?.status).toBe("PENDING");
    expect(fakeAdapter.cancelSubscription).not.toHaveBeenCalled();
  });
});

describe("a paid checkout nothing claims (R15)", () => {
  it("no matching period: the subscription is cancelled at once and logged; nothing is created", async () => {
    expect((await send(completed({ id: "cs_unknown", client_reference_id: "no-such-period" }))).status).toBe(200);

    expect(fakeAdapter.cancelSubscription).toHaveBeenCalledWith("sub_ada");
    expect(log).toHaveBeenCalled();
    expect(db.subscriptionPeriods).toHaveLength(1);
    expect(db.users).toHaveLength(1);
  });

  it("a checkout carrying no period id is cancelled the same way", async () => {
    expect((await send(completed({ client_reference_id: null }))).status).toBe(200);

    expect(fakeAdapter.cancelSubscription).toHaveBeenCalledWith("sub_ada");
    expect(row("pending-ada")?.status).toBe("PENDING");
  });

  it("the user deleted their account after starting the checkout: cancelled, and no user or period is created", async () => {
    db.users = [];
    db.subscriptionPeriods = [];

    expect((await send(completed())).status).toBe(200);
    expect(fakeAdapter.cancelSubscription).toHaveBeenCalledWith("sub_ada");
    expect(db.users).toEqual([]);
    expect(db.subscriptionPeriods).toEqual([]);
  });

  it("a cancel that fails is 500, so Stripe retries it", async () => {
    fakeAdapter.cancelSubscription.mockRejectedValue(new Error("Stripe down"));

    expect((await send(completed({ client_reference_id: "no-such-period" }))).status).toBe(500);
  });
});

describe("checkout.session.expired and the rest (R16)", () => {
  it("marks the matching pending row EXPIRED", async () => {
    expect((await send(expired())).status).toBe(200);
    expect(row("pending-ada")?.status).toBe("EXPIRED");
  });

  it("never moves a paid row back to EXPIRED", async () => {
    await send(completed());

    expect((await send(expired())).status).toBe(200);
    expect(row("pending-ada")?.status).toBe("PAID");
  });

  it("an expired checkout nothing claims is ignored; there is nothing to cancel", async () => {
    expect((await send(expired({ client_reference_id: "no-such-period" }))).status).toBe(200);
    expect(fakeAdapter.cancelSubscription).not.toHaveBeenCalled();
  });

  it("other event types answer 200 and write nothing", async () => {
    expect((await send(event("invoice.paid", { id: "in_1", object: "invoice" }))).status).toBe(200);
    expect(row("pending-ada")?.status).toBe("PENDING");
    expect(fakeAdapter.fetchCheckout).not.toHaveBeenCalled();
  });

  it("a failure while writing is 500, so Stripe retries", async () => {
    db.down = true;

    expect((await send(completed())).status).toBe(500);
  });

  it("a failure asking Stripe is 500 too", async () => {
    fakeAdapter.fetchCheckout.mockRejectedValue(new Error("Stripe down"));

    expect((await send(completed())).status).toBe(500);
    expect(row("pending-ada")?.status).toBe("PENDING");
  });
});
