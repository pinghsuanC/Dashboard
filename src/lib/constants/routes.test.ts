import { existsSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { describe, expect, it } from "vitest";

import { collectionHref, itemTypeHref, itemTypeNameFromSegment, ROUTES } from "./routes";

// Linked from the app before their pages exist. Remove an entry when its page lands.
const NOT_BUILT_YET = new Set<string>([ROUTES.settings, ROUTES.collections, ROUTES.items]);

const APP_DIR = join(process.cwd(), "src", "app");

/** Every URL path with a `page.tsx`, route groups like `(auth)` dropped. */
const pagePaths = (): Set<string> => {
  const paths = new Set<string>();
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) walk(join(dir, entry.name));
      else if (entry.name === "page.tsx") {
        const segments = relative(APP_DIR, dir)
          .split(sep)
          .filter((segment) => segment && !/^\(.*\)$/.test(segment));
        paths.add(`/${segments.join("/")}`);
      }
    }
  };
  walk(APP_DIR);
  return paths;
};

describe("ROUTES", () => {
  it("R1: every route the app links to has a page, apart from the ones listed as not built", () => {
    const pages = pagePaths();
    const missing = Object.values(ROUTES).filter(
      (path) => !pages.has(path) && !NOT_BUILT_YET.has(path),
    );

    expect(missing).toEqual([]);
  });

  it("R2: a route listed as not built is removed from the list once its page exists", () => {
    const pages = pagePaths();
    const built = [...NOT_BUILT_YET].filter((path) => pages.has(path));

    expect(built).toEqual([]);
  });

  it("R3: the app directory the check walks is the real one", () => {
    expect(existsSync(join(APP_DIR, "layout.tsx"))).toBe(true);
  });
});

describe("route builders", () => {
  it("R4: item type routes are the plural of the type name, under /items", () => {
    expect(itemTypeHref("snippet")).toBe("/items/snippets");
  });

  it("R5: collection routes are the slug under /collections", () => {
    expect(collectionHref("react-patterns")).toBe("/collections/react-patterns");
  });

  it("R6: an item type URL segment reads back as the type name it was built from", () => {
    const segment = itemTypeHref("snippet").split("/").pop()!;

    expect(itemTypeNameFromSegment(segment)).toBe("snippet");
  });

  it("R7: a segment that is not a plural type route reads as no type", () => {
    expect(itemTypeNameFromSegment("snippet")).toBeNull();
    expect(itemTypeNameFromSegment("s")).toBeNull();
  });
});
