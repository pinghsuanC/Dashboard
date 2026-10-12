import type { PageBounds, PageLink, Paginated } from "@/types/pagination";

/**
 * The page a `?page=` search param asks for: a plain positive whole number,
 * else 1. Lenient on purpose: a bad or hand-edited URL shows the first page
 * rather than an error. Past the end is left to `pageBounds`, which knows the total.
 */
export const parsePageParam = (value: string | string[] | undefined): number => {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) ? page : 1;
};

/**
 * Where page `requested` sits in a listing of `total` rows: the page (at
 * least 1), the page count (at least 1, so an empty listing is page 1 of 1)
 * and the rows to skip. A page past the end is kept as asked, so the caller
 * can tell (`isPastLastPage`) and redirect.
 */
export const pageBounds = (requested: number, total: number, perPage: number): PageBounds => {
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const page = Math.max(1, requested);
  return { page, pageCount, skip: (page - 1) * perPage };
};

/** A page beyond the listing's last, which the paginated pages redirect away from. */
export const isPastLastPage = ({ page, pageCount }: { page: number; pageCount: number }): boolean => page > pageCount;

/**
 * One page of a listing: `count` gives the total, `rows(skip)` reads at most
 * `perPage` rows from `skip`. Both run at once, one query each; a page past
 * the end comes back with no rows and `page > pageCount`.
 */
export const loadPage = async <T>(
  requested: number,
  perPage: number,
  count: () => Promise<number>,
  rows: (skip: number) => Promise<T[]>,
): Promise<Paginated<T>> => {
  // The page and skip don't depend on the total, so the rows are read alongside the count.
  const { page, skip } = pageBounds(requested, 0, perPage);
  const [total, pageRows] = await Promise.all([count(), rows(skip)]);
  const { pageCount } = pageBounds(page, total, perPage);
  return { rows: pageRows, page, pageCount, total };
};

/** Links shown at most; past this, pages far from the current one become a gap. */
const MAX_PAGE_LINKS = 7;

/**
 * The page links to draw: every page when there are few, else the first,
 * the last and the current page's neighbours, with a gap for each run left
 * out. Always `MAX_PAGE_LINKS` long once it has to shorten, so the controls
 * keep their width from page to page, and a gap never hides a single page.
 */
export const pageLinks = (page: number, pageCount: number): PageLink[] => {
  const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

  if (pageCount <= MAX_PAGE_LINKS) return range(1, pageCount);
  // First or last page, a gap, then five pages reaching the near end.
  if (page <= 4) return [...range(1, 5), "gap", pageCount];
  if (page >= pageCount - 3) return [1, "gap", ...range(pageCount - 4, pageCount)];
  return [1, "gap", page - 1, page, page + 1, "gap", pageCount];
};
