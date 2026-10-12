/** One page of a listing, with what the page links need. */
export interface Paginated<T> {
  rows: T[];
  /** The page asked for, from 1. Past `pageCount` when it is past the end; then `rows` is empty. */
  page: number;
  /** At least 1, so an empty listing is page 1 of 1. */
  pageCount: number;
  /** Rows across every page. */
  total: number;
}

/** Where one page sits in the listing, worked out from its total. */
export interface PageBounds {
  page: number;
  pageCount: number;
  /** Rows before this page, for the query's `skip`. */
  skip: number;
}

/** A page link to draw, or a gap standing in for the pages left out. */
export type PageLink = number | "gap";
