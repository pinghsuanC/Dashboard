/**
 * Locale and time zone are pinned deliberately. These dates are rendered in a
 * server component, so a formatter that follows the machine's locale would
 * produce whatever the server is set to and could disagree with the browser on
 * a re-render. Fixed inputs mean fixed output. Revisit when per-user locale
 * preferences exist.
 */
const SHORT_DATE = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

/** "2024-01-15T09:24:00.000Z" -> "Jan 15" */
export function formatShortDate(iso: string): string {
  return SHORT_DATE.format(new Date(iso));
}
