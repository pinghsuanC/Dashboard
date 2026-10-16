import { PRICE_CURRENCY, PRICE_LOCALE } from "@/lib/constants/pricing";

const MONTHS_PER_YEAR = 12;

// Two formatters so whole prices drop the ".00" but a fraction keeps both digits.
const WHOLE_PRICE = new Intl.NumberFormat(PRICE_LOCALE, {
  style: "currency",
  currency: PRICE_CURRENCY,
  maximumFractionDigits: 0,
});

const CENTS_PRICE = new Intl.NumberFormat(PRICE_LOCALE, {
  style: "currency",
  currency: PRICE_CURRENCY,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 8 -> "$8", 5.5 -> "$5.50", 1200 -> "$1,200" */
export function formatPrice(dollars: number): string {
  return Number.isInteger(dollars) ? WHOLE_PRICE.format(dollars) : CENTS_PRICE.format(dollars);
}

/** A yearly price spread over its months: 72 -> 6. */
export function monthlyEquivalent(yearlyPrice: number): number {
  return yearlyPrice / MONTHS_PER_YEAR;
}

/**
 * Whole percent saved by paying yearly instead of twelve monthly payments:
 * (8, 72) -> 25. Never negative, and 0 for a free plan.
 */
export function yearlySavingPercent(monthlyPrice: number, yearlyPrice: number): number {
  const twelveMonths = monthlyPrice * MONTHS_PER_YEAR;
  if (twelveMonths <= 0) return 0;
  return Math.max(0, Math.round((1 - yearlyPrice / twelveMonths) * 100));
}
