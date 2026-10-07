import type { DateKeys, Jsonified } from "@/types/json";

/**
 * Turns a JSON body's date strings back into `Date`s, for fetches whose type
 * says `Date` where `response.json()` gives a string. `fields` must name every
 * top-level `Date` field of `T`, so one added to `T` fails to compile until it
 * is listed here. Only listed fields change: a title that looks like a date
 * stays a string.
 *
 * Top level only, and so is the compile check: a `Date` inside a nested
 * object (an item's `collections`, say) is neither revived nor caught. None
 * exist yet; revive one by hand, or extend this, when one is added.
 */
export const reviveDates = <T>(json: NoInfer<Jsonified<T>>, fields: NoInfer<Record<DateKeys<T>, true>>): T => {
  const revived: Record<string, unknown> = { ...json };
  for (const key of Object.keys(fields)) {
    const value = revived[key];
    if (typeof value === "string") revived[key] = new Date(value);
  }
  return revived as T;
};
