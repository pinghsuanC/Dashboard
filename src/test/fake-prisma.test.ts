import { beforeEach, describe, expect, it } from "vitest";

import { db, fakePrisma, resetDb } from "./fake-prisma";

// The fake stands in for Postgres in every database test, so the period
// rules the schema enforces must hold here too, or a test could pass on a
// write the real database refuses.

const END = new Date(Date.UTC(2026, 5, 1));
const LATER = new Date(Date.UTC(2026, 6, 1));

const codeOf = (run: () => Promise<unknown>) =>
  run().then(
    () => null,
    (error: { code?: string }) => error.code ?? "error",
  );

beforeEach(() => {
  resetDb();
  db.users.push(
    { id: "ada", name: "Ada", email: "ada@example.test", passwordHash: null, createdAt: new Date() },
    { id: "bob", name: "Bob", email: "bob@example.test", passwordHash: null, createdAt: new Date() },
  );
});

describe("subscription periods in the fake database", () => {
  it("R1/R2/R4: a new row defaults to PAID with no vendor (granted)", async () => {
    const row = await fakePrisma.subscriptionPeriod.create({ data: { userId: "ada", interval: "YEAR", periodEnd: END } });

    expect(row).toMatchObject({ userId: "ada", status: "PAID", vendor: null });
  });

  it("R1: a row must belong to an existing user", async () => {
    expect(await codeOf(() => fakePrisma.subscriptionPeriod.create({ data: { userId: "ghost", interval: "MONTH" } }))).toBe("error");
    expect(db.subscriptionPeriods).toHaveLength(0);
  });

  it("R1: deleting a user deletes their periods and no one else's", async () => {
    db.subscriptionPeriods.push(
      { id: "ada-p", userId: "ada", interval: "MONTH" },
      { id: "bob-p", userId: "bob", interval: "MONTH" },
    );

    await fakePrisma.user.delete({ where: { id: "ada" } });

    expect(db.subscriptionPeriods.map((row) => row.id)).toEqual(["bob-p"]);
  });

  it("R5: a Stripe checkout session is stored once", async () => {
    const pending = { userId: "ada", status: "PENDING", vendor: "STRIPE", interval: "MONTH", stripeCheckoutSessionId: "cs_1" } as const;
    await fakePrisma.subscriptionPeriod.create({ data: pending });

    expect(await codeOf(() => fakePrisma.subscriptionPeriod.create({ data: { ...pending, userId: "bob" } }))).toBe("P2002");
    expect(db.subscriptionPeriods).toHaveLength(1);
  });

  it("stores the same vendor period once", async () => {
    const paid = { userId: "ada", vendor: "STRIPE", vendorSubscriptionId: "sub_1", interval: "MONTH", periodEnd: END } as const;
    await fakePrisma.subscriptionPeriod.create({ data: paid });

    expect(await codeOf(() => fakePrisma.subscriptionPeriod.create({ data: { ...paid } }))).toBe("P2002");
  });

  it("stores each renewal of a subscription, as a period with a new end", async () => {
    const paid = { userId: "ada", vendor: "STRIPE", vendorSubscriptionId: "sub_1", interval: "MONTH", periodEnd: END } as const;
    await fakePrisma.subscriptionPeriod.create({ data: paid });

    expect(await codeOf(() => fakePrisma.subscriptionPeriod.create({ data: { ...paid, periodEnd: LATER } }))).toBeNull();
  });

  it("R4: granted rows never clash, as NULLs are distinct in Postgres", async () => {
    const granted = { userId: "ada", vendor: null, vendorSubscriptionId: null, interval: "YEAR", periodEnd: END } as const;
    await fakePrisma.subscriptionPeriod.create({ data: granted });

    expect(await codeOf(() => fakePrisma.subscriptionPeriod.create({ data: { ...granted } }))).toBeNull();
    expect(db.subscriptionPeriods).toHaveLength(2);
  });

  it("R2: marking a pending row paid is conditional, so two racing writes change it once", async () => {
    db.subscriptionPeriods.push({ id: "p1", userId: "ada", status: "PENDING", interval: "MONTH" });
    const markPaid = () =>
      fakePrisma.subscriptionPeriod.updateMany({
        where: { id: "p1", status: "PENDING" },
        data: { status: "PAID", periodEnd: END },
      });

    expect(await markPaid()).toEqual({ count: 1 });
    expect(await markPaid()).toEqual({ count: 0 });
    expect(db.subscriptionPeriods[0]).toMatchObject({ status: "PAID", periodEnd: END });
  });

  it("R2: the condition leaves rows in another status alone", async () => {
    db.subscriptionPeriods.push({ id: "p1", userId: "ada", status: "EXPIRED", interval: "MONTH" });

    const result = await fakePrisma.subscriptionPeriod.updateMany({ where: { id: "p1", status: "PENDING" }, data: { status: "PAID" } });

    expect(result).toEqual({ count: 0 });
    expect(db.subscriptionPeriods[0].status).toBe("EXPIRED");
  });
});
