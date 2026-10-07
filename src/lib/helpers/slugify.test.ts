import { describe, expect, it } from "vitest";

import { slugify } from "./slugify";

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
