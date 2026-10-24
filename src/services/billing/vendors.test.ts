import { beforeEach, describe, expect, it, vi } from "vitest";

import { BillingNotConfiguredError } from "@/lib/billing/billing-errors";

import { stripeBilling } from "./stripe";
import { adapterFor, adapterForSegment, checkoutAdapter } from "./vendors";

beforeEach(() => {
  vi.unstubAllEnvs();
});

describe("the vendor registry (R7)", () => {
  it("maps every vendor to its adapter, whatever BILLING_VENDOR says", () => {
    vi.stubEnv("BILLING_VENDOR", "something-else");

    expect(adapterFor("STRIPE")).toBe(stripeBilling);
  });

  it("finds a webhook's adapter by its lower-case URL segment; anything else is no vendor", () => {
    expect(adapterForSegment("stripe")).toBe(stripeBilling);
    expect(adapterForSegment("STRIPE")).toBeNull();
    expect(adapterForSegment("paypal")).toBeNull();
    expect(adapterForSegment("toString")).toBeNull();
  });

  it("new checkouts use BILLING_VENDOR, in any case", () => {
    vi.stubEnv("BILLING_VENDOR", " Stripe ");

    expect(checkoutAdapter()).toBe(stripeBilling);
  });

  it("new checkouts default to Stripe when BILLING_VENDOR is unset", () => {
    vi.stubEnv("BILLING_VENDOR", "");

    expect(checkoutAdapter()).toBe(stripeBilling);
  });

  it("a BILLING_VENDOR naming no vendor is a configuration error, naming the setting", () => {
    vi.stubEnv("BILLING_VENDOR", "paypal");

    expect(() => checkoutAdapter()).toThrow(BillingNotConfiguredError);
    expect(() => checkoutAdapter()).toThrow(expect.objectContaining({ missing: ["BILLING_VENDOR"] }));
  });
});
