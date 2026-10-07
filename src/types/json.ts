/** The keys of `T` whose value is a `Date`, or a `Date` or `null`. */
export type DateKeys<T> = {
  [K in keyof T]-?: NonNullable<T[K]> extends Date ? K : never;
}[keyof T];

/**
 * `T` as it comes back from `response.json()`: `JSON.stringify` writes each
 * top-level `Date` as an ISO string, and nothing turns it back.
 */
export type Jsonified<T> = {
  [K in keyof T]: K extends DateKeys<T> ? Exclude<T[K], Date> | string : T[K];
};
