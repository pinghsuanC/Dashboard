import { describe, expect, it } from "vitest";

import { isSlug, slugify } from "./slugify";

// The seed's slugs are already in the database, so the shared helper must
// produce exactly what the seed's own copy did.
describe("slugify, shared by the seed and item edit (S1)", () => {
  it("lowercases", () => {
    expect(slugify("React")).toBe("react");
  });

  it("turns each run of other characters into one hyphen", () => {
    expect(slugify("Next.js 16")).toBe("next-js-16");
    expect(slugify("React  --  Hooks")).toBe("react-hooks");
  });

  it("trims hyphens from both ends", () => {
    expect(slugify("  --React Patterns!! ")).toBe("react-patterns");
  });

  it("gives names that differ only in case, spacing or punctuation one slug", () => {
    expect(new Set(["React", "react", " react ", "REACT!"].map(slugify))).toEqual(new Set(["react"]));
  });

  it("is empty when the name has no letter or digit", () => {
    expect(slugify("!!!")).toBe("");
  });
});

describe("slugs are URL-safe as they are (CP9)", () => {
  const names = ["React Patterns", "Next.js 16 / App Router", "C# & .NET?", "50% off #deals", "Über Café", "日本語 notes", "a/../b"];

  it("CP9: every slugify output is lowercase letters, digits and single inner hyphens", () => {
    for (const name of names) {
      expect(isSlug(slugify(name), 100), name).toBe(true);
    }
  });

  it("CP9: a slug reads the same after URL encoding", () => {
    for (const name of names) {
      const slug = slugify(name);
      expect(encodeURIComponent(slug)).toBe(slug);
    }
  });
});

describe("a URL segment is checked before it reaches the database (CP11)", () => {
  it("CP11: accepts only slug-shaped segments", () => {
    const segments = [
      "react-patterns",
      "a",
      "next-js-16",
      "React-Patterns",
      "react patterns",
      "react%20patterns",
      "-react",
      "react-",
      "react--patterns",
      "../profile",
      "react_patterns",
      "",
    ];

    expect(segments.filter((segment) => isSlug(segment, 100))).toEqual(["react-patterns", "a", "next-js-16"]);
  });

  it("CP11: accepts a slug at the length limit and rejects one past it", () => {
    expect([isSlug("a".repeat(10), 10), isSlug("a".repeat(11), 10)]).toEqual([true, false]);
  });
});
