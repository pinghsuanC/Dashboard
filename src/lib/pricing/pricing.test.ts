import { describe, expect, it } from "vitest";

import { PRICING } from "@/lib/constants/pricing";

import { formatPrice, monthlyEquivalent, yearlySavingPercent } from "./pricing";

describe("price labels on the homepage", () => {
  it("shows whole dollars without cents", () => {
    expect(formatPrice(8)).toBe("$8");
    expect(formatPrice(0)).toBe("$0");
  });

  it("shows cents when the price has them", () => {
    expect(formatPrice(5.5)).toBe("$5.50");
    expect(formatPrice(5.833333)).toBe("$5.83");
  });

  it("groups thousands", () => {
    expect(formatPrice(1200)).toBe("$1,200");
  });
});

describe("yearly plan shown per month", () => {
  it("spreads the yearly price over twelve months", () => {
    expect(monthlyEquivalent(72)).toBe(6);
    expect(monthlyEquivalent(60)).toBe(5);
  });

  it("keeps the fraction when the yearly price doesn't divide by twelve", () => {
    expect(monthlyEquivalent(70)).toBeCloseTo(5.8333, 4);
  });
});

describe("yearly saving badge", () => {
  it("is the share saved against twelve monthly payments", () => {
    expect(yearlySavingPercent(8, 72)).toBe(25);
    expect(yearlySavingPercent(10, 60)).toBe(50);
  });

  it("rounds to a whole percent", () => {
    // 80 against 96 saves 16.67%
    expect(yearlySavingPercent(8, 80)).toBe(17);
    // 85 against 96 saves 11.46%
    expect(yearlySavingPercent(8, 85)).toBe(11);
  });

  it("never shows a negative saving when yearly costs as much or more", () => {
    expect(yearlySavingPercent(8, 96)).toBe(0);
    expect(yearlySavingPercent(8, 120)).toBe(0);
  });

  it("is zero for a free monthly plan rather than dividing by zero", () => {
    expect(yearlySavingPercent(0, 0)).toBe(0);
  });
});

describe("advertised Pro prices", () => {
  it("read as $8 a month, or $6 a month billed $72 a year, saving 25%", () => {
    const { monthlyPrice, yearlyPrice } = PRICING.pro;
    expect(formatPrice(monthlyPrice)).toBe("$8");
    expect(formatPrice(monthlyEquivalent(yearlyPrice))).toBe("$6");
    expect(formatPrice(yearlyPrice)).toBe("$72");
    expect(yearlySavingPercent(monthlyPrice, yearlyPrice)).toBe(25);
  });
});
