import { describe, expect, it } from "vitest";

import { COLLECTION_DESCRIPTION_MAX_LENGTH, COLLECTION_NAME_MAX_LENGTH } from "@/lib/constants/limits";
import {
  COLLECTION_DESCRIPTION_TOO_LONG,
  COLLECTION_NAME_INVALID,
  COLLECTION_NAME_REQUIRED,
  COLLECTION_NAME_TOO_LONG,
} from "@/lib/constants/messages/collections";
import { fieldErrorsOf } from "@/lib/helpers/form-errors";

import { collectionCreateSchema } from "./collection-schemas";

const parse = (input: unknown) => {
  const result = collectionCreateSchema.safeParse(input);
  if (!result.success) throw new Error(`expected a valid collection: ${result.error.message}`);
  return result.data;
};

const errorsFor = (input: unknown) => {
  const result = collectionCreateSchema.safeParse(input);
  if (result.success) throw new Error("expected the collection to fail");
  return fieldErrorsOf(result.error);
};

describe("collection create validation: name (S1)", () => {
  it("trims the name", () => {
    expect(parse({ name: "  React Patterns  " }).name).toBe("React Patterns");
  });

  it("rejects a blank name", () => {
    expect(errorsFor({ name: "   " })).toEqual({ name: COLLECTION_NAME_REQUIRED });
  });

  it("rejects a missing name", () => {
    expect(errorsFor({})).toEqual({ name: COLLECTION_NAME_REQUIRED });
  });

  it("CP10: caps names at 50 characters, so collection URLs stay short", () => {
    expect(parse({ name: "a".repeat(50) }).name).toHaveLength(50);
    expect(errorsFor({ name: "a".repeat(51) })).toEqual({ name: COLLECTION_NAME_TOO_LONG });
  });

  it("accepts a name at the limit and rejects one past it", () => {
    expect(parse({ name: "a".repeat(COLLECTION_NAME_MAX_LENGTH) }).name).toHaveLength(COLLECTION_NAME_MAX_LENGTH);
    expect(errorsFor({ name: "a".repeat(COLLECTION_NAME_MAX_LENGTH + 1) })).toEqual({
      name: COLLECTION_NAME_TOO_LONG,
    });
  });
});

describe("collection create validation: name needs a slug (S2)", () => {
  it("rejects a name with no letters or digits, which would slug to nothing", () => {
    expect(errorsFor({ name: "!!!" })).toEqual({ name: COLLECTION_NAME_INVALID });
    expect(errorsFor({ name: "日本語" })).toEqual({ name: COLLECTION_NAME_INVALID });
  });

  it("accepts a name with punctuation around letters", () => {
    expect(parse({ name: "C++ & Rust!" }).name).toBe("C++ & Rust!");
  });
});

describe("collection create validation: description (S3)", () => {
  it("trims the description", () => {
    expect(parse({ name: "Docs", description: "  Reference links  " }).description).toBe("Reference links");
  });

  it("stores a blank or missing description as null", () => {
    expect(parse({ name: "Docs", description: "   " }).description).toBeNull();
    expect(parse({ name: "Docs" }).description).toBeNull();
  });

  it("rejects a description past the limit", () => {
    expect(errorsFor({ name: "Docs", description: "a".repeat(COLLECTION_DESCRIPTION_MAX_LENGTH + 1) })).toEqual({
      description: COLLECTION_DESCRIPTION_TOO_LONG,
    });
  });
});

describe("collection create validation: favourite (S4)", () => {
  it("defaults to not a favourite", () => {
    expect(parse({ name: "Docs" }).isFavorite).toBe(false);
  });

  it("keeps a favourite", () => {
    expect(parse({ name: "Docs", isFavorite: true }).isFavorite).toBe(true);
  });

  it("rejects a value that isn't a boolean", () => {
    expect(collectionCreateSchema.safeParse({ name: "Docs", isFavorite: "yes" }).success).toBe(false);
  });
});

describe("collection create validation: only its own fields (S5)", () => {
  it("drops keys it doesn't define, so a request can't pick the owner or slug", () => {
    expect(parse({ name: "Docs", userId: "bob", slug: "hijack", id: "x" })).toEqual({
      name: "Docs",
      description: null,
      isFavorite: false,
    });
  });
});
