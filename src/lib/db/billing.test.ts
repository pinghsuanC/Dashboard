import { beforeEach, describe, expect, it, vi } from "vitest";

import { SUBSCRIPTIONS_PER_PAGE } from "@/lib/constants/limits";
import { requireCurrentUserId } from "@/services/auth/session";
import { db, resetDb } from "@/test/fake-prisma";

import { getSubscriptionsPage } from "./billing";

vi.mock("@/services/auth/session", () => ({ requireCurrentUserId: vi.fn() }));
vi.mock("@/services/prisma", async () => ({ prisma: (await import("@/test/fake-prisma")).fakePrisma }));

const day = (n: number) => new Date(Date.UTC(2026, 0, n));

/** A paid Stripe month starting on `start`, unless overridden. */
const addPeriod = (id: string, userId: string, start: number, extra: Partial<(typeof db.subscriptionPeriods)[number]> = {}) =>
  db.subscriptionPeriods.push({
    id,
    userId,
    status: "PAID",
    vendor: "STRIPE",
    vendorCustomerId: "cus_secret",
    vendorSubscriptionId: "sub_secret",
    stripeCheckoutSessionId: `cs_${id}`,
    stripePriceId: "price_secret",
    interval: "MONTH",
    periodStart: day(start),
    periodEnd: day(start + 30),
    ...extra,
  });

const ids = async (page?: number) => (await getSubscriptionsPage(page)).rows.map((row) => row.id);

beforeEach(() => {
  resetDb();
  vi.mocked(requireCurrentUserId).mockResolvedValue("ada");
});

describe("getSubscriptionsPage", () => {
  it("P1: lists only the signed-in user's periods", async () => {
    addPeriod("ada-1", "ada", 1);
    addPeriod("bob-1", "bob", 2);

    expect(await ids()).toEqual(["ada-1"]);
    expect((await getSubscriptionsPage()).total).toBe(1);
  });

  it("P2: takes no user id; the session decides whose periods are read", async () => {
    addPeriod("bob-1", "bob", 1);
    const call = getSubscriptionsPage as (...args: unknown[]) => ReturnType<typeof getSubscriptionsPage>;

    expect((await call(1, "bob")).rows).toEqual([]);
  });

  it("P3: leaves out pending and abandoned checkouts, in the rows and the total", async () => {
    addPeriod("paid", "ada", 1);
    addPeriod("pending", "ada", 2, { status: "PENDING", periodStart: null, periodEnd: null });
    addPeriod("expired", "ada", 3, { status: "EXPIRED", periodStart: null, periodEnd: null });

    const page = await getSubscriptionsPage();

    expect(page.rows.map((row) => row.id)).toEqual(["paid"]);
    expect(page.total).toBe(1);
  });

  it("P4: lists granted periods too, marked granted; vendor ones are paid", async () => {
    addPeriod("trial", "ada", 1, { vendor: null, vendorCustomerId: null, vendorSubscriptionId: null, stripeCheckoutSessionId: null, stripePriceId: null });
    addPeriod("stripe", "ada", 40);

    const rows = (await getSubscriptionsPage()).rows;

    expect(rows.map(({ id, source }) => [id, source])).toEqual([
      ["stripe", "paid"],
      ["trial", "granted"],
    ]);
  });

  it("P5: newest start first, and the same start ordered by id so pages never repeat a row", async () => {
    // "a" goes in first, so only the id order puts "b" ahead of it.
    addPeriod("a", "ada", 5);
    addPeriod("old", "ada", 1);
    addPeriod("b", "ada", 5);
    addPeriod("new", "ada", 9);

    expect(await ids()).toEqual(["new", "b", "a", "old"]);
  });

  it("P6: pages SUBSCRIPTIONS_PER_PAGE at a time, with the total and page count", async () => {
    const count = SUBSCRIPTIONS_PER_PAGE + 3;
    for (let n = 1; n <= count; n++) addPeriod(`p${String(n).padStart(2, "0")}`, "ada", n);

    const first = await getSubscriptionsPage(1);
    const second = await getSubscriptionsPage(2);

    expect(first.rows).toHaveLength(SUBSCRIPTIONS_PER_PAGE);
    expect(first.rows[0].id).toBe(`p${count}`);
    expect(second.rows.map((row) => row.id)).toEqual(["p03", "p02", "p01"]);
    expect(first).toMatchObject({ page: 1, pageCount: 2, total: count });
    expect(second).toMatchObject({ page: 2, pageCount: 2, total: count });
  });

  it("P7: a page past the end comes back empty, past pageCount", async () => {
    addPeriod("only", "ada", 1);

    expect(await getSubscriptionsPage(3)).toEqual({ rows: [], page: 3, pageCount: 1, total: 1 });
  });

  it("P8: returns the period's dates, interval and state, and never a vendor id", async () => {
    addPeriod("year", "ada", 1, { interval: "YEAR" });

    const [row] = (await getSubscriptionsPage()).rows;

    expect(row).toEqual({
      id: "year",
      interval: "YEAR",
      source: "paid",
      periodStart: day(1),
      periodEnd: day(31),
      state: "ended",
    });
    expect(JSON.stringify(row)).not.toMatch(/cus_|sub_|cs_|price_/);
  });
});
