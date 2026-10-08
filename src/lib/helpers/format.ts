import { DATE_LOCALE, DATE_TIME_ZONE } from "@/lib/constants/locale";
import { HOUR_MS, MINUTE_MS } from "@/lib/constants/time";

// Locale and time zone are pinned: see DATE_LOCALE.
const SHORT_DATE = new Intl.DateTimeFormat(DATE_LOCALE, {
  month: "short",
  day: "numeric",
  timeZone: DATE_TIME_ZONE,
});

/** 2024-01-15T09:24:00.000Z -> "Jan 15" */
export function formatShortDate(date: Date): string {
  return SHORT_DATE.format(date);
}

const LONG_DATE = new Intl.DateTimeFormat(DATE_LOCALE, {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: DATE_TIME_ZONE,
});

/** 2024-01-15T09:24:00.000Z -> "January 15, 2024" */
export function formatLongDate(date: Date): string {
  return LONG_DATE.format(date);
}

const plural = (count: number, unit: string) => `${count} ${unit}${count === 1 ? "" : "s"}`;

/**
 * A file size as people read it, in binary units (1 KB = 1024 bytes) like the
 * limits. Whole numbers stay whole, others get one decimal.
 * 5_242_880 -> "5 MB", 1536 -> "1.5 KB", 900 -> "900 B"
 */
export function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const rounded = Number.isInteger(value) ? value : Math.round(value * 10) / 10;
  return `${rounded} ${units[unit]}`;
}

/**
 * A lifetime as people read it: whole hours when it divides evenly, else
 * minutes rounded up. Hours, not days, so a 24-hour link reads "24 hours".
 * 3_600_000 -> "1 hour", 86_400_000 -> "24 hours", 120_000 -> "2 minutes"
 */
export function formatDuration(ms: number): string {
  if (ms >= HOUR_MS && ms % HOUR_MS === 0) return plural(ms / HOUR_MS, "hour");
  return plural(Math.max(1, Math.ceil(ms / MINUTE_MS)), "minute");
}
