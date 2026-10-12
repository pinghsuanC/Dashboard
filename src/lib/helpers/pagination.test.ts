import { describe, expect, it } from "vitest";

import { isPastLastPage, pageBounds, pageLinks, parsePageParam } from "./pagination";

describe("the page a URL asks for (parsePageParam, P4)", () => {
  it("P4: reads a positive whole number", () => {
    expect(parsePageParam("1")).toBe(1);
    expect(parsePageParam("2")).toBe(2);
    expect(parsePageParam("40")).toBe(40);
  });

  it("P4: anything else is page 1, never an error", () => {
    for (const value of [undefined, "", "0", "-1", "1.5", "2abc", "abc", " 2", "1e3", "0x2", "Infinity", "NaN"]) {
      expect(parsePageParam(value), String(value)).toBe(1);
    }
  });

  it("P4: a repeated param (?page=2&page=3) is page 1, not a guess at one of them", () => {
    expect(parsePageParam(["2", "3"])).toBe(1);
    expect(parsePageParam(["2"])).toBe(1);
  });

  it("P4: a number too large to count exactly is page 1", () => {
    expect(parsePageParam("99999999999999999999")).toBe(1);
  });
});

describe("where a page sits (pageBounds, P1 P3)", () => {
  it("P1: skips the rows of the pages before it", () => {
    expect(pageBounds(1, 50, 21)).toEqual({ page: 1, pageCount: 3, skip: 0 });
    expect(pageBounds(2, 50, 21)).toEqual({ page: 2, pageCount: 3, skip: 21 });
    expect(pageBounds(3, 50, 21)).toEqual({ page: 3, pageCount: 3, skip: 42 });
  });

  it("P1: a total that fills its pages exactly has no extra empty page", () => {
    expect(pageBounds(1, 42, 21).pageCount).toBe(2);
    expect(pageBounds(1, 43, 21).pageCount).toBe(3);
  });

  it("P3: a page past the end stays the page asked for, past the page count, for the caller to redirect", () => {
    expect(pageBounds(4, 50, 21)).toEqual({ page: 4, pageCount: 3, skip: 63 });
    expect(pageBounds(1000, 22, 21)).toMatchObject({ page: 1000, pageCount: 2 });
  });

  it("P3: an empty listing has one page, so page 1 of it is not past the end", () => {
    expect(pageBounds(1, 0, 21)).toEqual({ page: 1, pageCount: 1, skip: 0 });
    expect(pageBounds(5, 0, 21)).toMatchObject({ page: 5, pageCount: 1 });
  });

  it("P3: a page below 1 is page 1", () => {
    expect(pageBounds(0, 50, 21)).toEqual({ page: 1, pageCount: 3, skip: 0 });
    expect(pageBounds(-2, 50, 21)).toEqual({ page: 1, pageCount: 3, skip: 0 });
  });
});

describe("whether to redirect (isPastLastPage, P3)", () => {
  it("P3: only a page beyond the page count is past the end", () => {
    expect(isPastLastPage({ page: 3, pageCount: 3 })).toBe(false);
    expect(isPastLastPage({ page: 1, pageCount: 1 })).toBe(false);
    expect(isPastLastPage({ page: 4, pageCount: 3 })).toBe(true);
    expect(isPastLastPage({ page: 2, pageCount: 1 })).toBe(true);
  });
});

describe("the page links to draw (pageLinks, P5)", () => {
  it("P5: a few pages are all listed", () => {
    expect(pageLinks(1, 1)).toEqual([1]);
    expect(pageLinks(2, 3)).toEqual([1, 2, 3]);
    expect(pageLinks(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("P5: from 8 pages on, the list shortens", () => {
    expect(pageLinks(1, 8)).toEqual([1, 2, 3, 4, 5, "gap", 8]);
  });

  it("P5: many pages keep the first, the last and the current one's neighbours, with gaps between", () => {
    expect(pageLinks(10, 20)).toEqual([1, "gap", 9, 10, 11, "gap", 20]);
  });

  it("P5: near either end, the run of pages reaches it with no gap of one page", () => {
    expect(pageLinks(1, 20)).toEqual([1, 2, 3, 4, 5, "gap", 20]);
    expect(pageLinks(4, 20)).toEqual([1, 2, 3, 4, 5, "gap", 20]);
    expect(pageLinks(17, 20)).toEqual([1, "gap", 16, 17, 18, 19, 20]);
    expect(pageLinks(20, 20)).toEqual([1, "gap", 16, 17, 18, 19, 20]);
  });

  it("P5: every list is the same length once there are more than 7 pages, so the controls don't jump", () => {
    for (let page = 1; page <= 12; page++) {
      expect(pageLinks(page, 12), `page ${page}`).toHaveLength(7);
    }
  });

  it("P5: the current page is always in the list", () => {
    for (let page = 1; page <= 12; page++) {
      expect(pageLinks(page, 12)).toContain(page);
    }
  });
});
