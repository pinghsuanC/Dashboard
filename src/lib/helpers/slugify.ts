/**
 * The key a name is matched on: lowercase, every run of anything but a-z
 * and 0-9 turned into one hyphen, none at either end. Tags and collections
 * are unique per user on this (`[userId, slug]`), so names that differ only
 * in case, spacing or punctuation share one row.
 *
 * Known limit: ASCII only, so a name with no a-z or 0-9 (e.g. "日本語")
 * slugs to "", which item edit rejects as a tag. Kept as the seed had it,
 * since existing rows were keyed this way.
 */
export const slugify = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/**
 * Whether `value` has the shape `slugify` produces (lowercase letters and
 * digits, single hyphens between them) and fits `maxLength`. Such a string
 * needs no URL encoding, so a route segment can be checked with this before
 * any query runs.
 */
export const isSlug = (value: string, maxLength: number): boolean =>
  value.length <= maxLength && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value);
