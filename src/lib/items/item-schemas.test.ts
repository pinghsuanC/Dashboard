import { describe, expect, it } from "vitest";

import {
  ITEM_CONTENT_MAX_LENGTH,
  ITEM_DESCRIPTION_MAX_LENGTH,
  ITEM_TITLE_MAX_LENGTH,
} from "@/lib/constants/limits";
import {
  ITEM_CONTENT_TOO_LONG,
  ITEM_DESCRIPTION_TOO_LONG,
  ITEM_TAG_INVALID,
  ITEM_TITLE_REQUIRED,
  ITEM_TITLE_TOO_LONG,
  ITEM_URL_INVALID,
  ITEM_URL_REQUIRED,
} from "@/lib/constants/messages/items";
import { fieldErrorsOf } from "@/lib/helpers/form-errors";

import { itemCreateSchemaFor, itemUpdateSchemaFor } from "./item-schemas";

const parse = (typeName: string, input: unknown) => {
  const result = itemUpdateSchemaFor(typeName).safeParse(input);
  if (!result.success) throw new Error(`expected a valid edit: ${result.error.message}`);
  return result.data;
};

const errorsFor = (typeName: string, input: unknown) => {
  const result = itemUpdateSchemaFor(typeName).safeParse(input);
  if (result.success) throw new Error("expected the edit to fail");
  return fieldErrorsOf(result.error);
};

describe("item edit validation: title (V1)", () => {
  it("trims the title", () => {
    expect(parse("note", { title: "  Meeting notes  " }).title).toBe("Meeting notes");
  });

  it("rejects a blank title", () => {
    expect(errorsFor("note", { title: "   " })).toEqual({ title: ITEM_TITLE_REQUIRED });
  });

  it("rejects a missing title", () => {
    expect(errorsFor("note", {})).toEqual({ title: ITEM_TITLE_REQUIRED });
  });

  it("caps the title length", () => {
    expect(parse("note", { title: "a".repeat(ITEM_TITLE_MAX_LENGTH) }).title).toHaveLength(ITEM_TITLE_MAX_LENGTH);
    expect(errorsFor("note", { title: "a".repeat(ITEM_TITLE_MAX_LENGTH + 1) })).toEqual({ title: ITEM_TITLE_TOO_LONG });
  });
});

describe("item edit validation: optional text (V2)", () => {
  it("trims description, content and language", () => {
    expect(
      parse("snippet", { title: "T", description: " d ", content: "  code  ", language: " ts " }),
    ).toMatchObject({ description: "d", content: "code", language: "ts" });
  });

  it("turns blank text into null, which clears the field", () => {
    expect(
      parse("snippet", { title: "T", description: "  ", content: "", language: " " }),
    ).toMatchObject({ description: null, content: null, language: null });
  });

  it("keeps null as null", () => {
    expect(parse("snippet", { title: "T", description: null, content: null })).toMatchObject({
      description: null,
      content: null,
    });
  });

  it("leaves a field that wasn't sent undefined, so it isn't written", () => {
    const data = parse("snippet", { title: "T" });

    expect(data.description).toBeUndefined();
    expect(data.content).toBeUndefined();
    expect(data.language).toBeUndefined();
    expect(data.tags).toBeUndefined();
  });

  it("caps the description length", () => {
    const long = "a".repeat(ITEM_DESCRIPTION_MAX_LENGTH + 1);

    expect(errorsFor("note", { title: "T", description: long })).toEqual({ description: ITEM_DESCRIPTION_TOO_LONG });
  });

  it("caps the content length", () => {
    expect(parse("note", { title: "T", content: "a".repeat(ITEM_CONTENT_MAX_LENGTH) }).content).toHaveLength(ITEM_CONTENT_MAX_LENGTH);
    expect(errorsFor("note", { title: "T", content: "a".repeat(ITEM_CONTENT_MAX_LENGTH + 1) })).toEqual({ content: ITEM_CONTENT_TOO_LONG });
  });
});

describe("item edit validation: fields depend on the type (V3)", () => {
  it("drops fields the type doesn't edit, whatever they hold", () => {
    const data = parse("note", { title: "T", content: "body", language: "ts", url: "not a url" });

    expect(data.content).toBe("body");
    expect(data.language).toBeUndefined();
    expect(data.url).toBeUndefined();
  });

  it("a custom type keeps only title, description and tags", () => {
    expect(
      parse("my-type", { title: "T", description: "d", tags: ["a"], content: "c", language: "l", url: "https://x.dev" }),
    ).toEqual({ title: "T", description: "d", tags: ["a"] });
  });
});

describe("item edit validation: link URL (V4)", () => {
  it("accepts an http or https URL, trimmed", () => {
    expect(parse("link", { title: "T", url: " https://nextjs.org/docs " }).url).toBe("https://nextjs.org/docs");
    expect(parse("link", { title: "T", url: "http://localhost:3000" }).url).toBe("http://localhost:3000");
  });

  it("rejects text that isn't a URL", () => {
    expect(errorsFor("link", { title: "T", url: "nextjs docs" })).toEqual({ url: ITEM_URL_INVALID });
  });

  it("rejects other schemes, such as javascript:", () => {
    expect(errorsFor("link", { title: "T", url: "javascript:alert(1)" })).toEqual({ url: ITEM_URL_INVALID });
    expect(errorsFor("link", { title: "T", url: "ftp://files.example.com" })).toEqual({ url: ITEM_URL_INVALID });
  });

  it("a link must keep a URL: blank, null and missing are rejected", () => {
    expect(errorsFor("link", { title: "T", url: "  " })).toEqual({ url: ITEM_URL_REQUIRED });
    expect(errorsFor("link", { title: "T", url: null })).toEqual({ url: ITEM_URL_REQUIRED });
    expect(errorsFor("link", { title: "T" })).toEqual({ url: ITEM_URL_REQUIRED });
  });
});

describe("item edit validation: tags (V5)", () => {
  it("trims tags and drops blank ones", () => {
    expect(parse("note", { title: "T", tags: [" react ", "", "  ", "hooks"] }).tags).toEqual(["react", "hooks"]);
  });

  it("drops tags whose slug repeats an earlier one, keeping the first spelling", () => {
    expect(parse("note", { title: "T", tags: ["React", "react", " REACT!", "Hooks"] }).tags).toEqual(["React", "Hooks"]);
  });

  it("an empty list clears the tags", () => {
    expect(parse("note", { title: "T", tags: [] }).tags).toEqual([]);
  });

  it("rejects a tag with no letter or digit", () => {
    expect(errorsFor("note", { title: "T", tags: ["react", "!!!"] })).toEqual({ tags: ITEM_TAG_INVALID });
  });

  it("rejects tags that aren't a list of strings", () => {
    expect(errorsFor("note", { title: "T", tags: "react, hooks" })).toHaveProperty("tags");
    expect(errorsFor("note", { title: "T", tags: [1, 2] })).toHaveProperty("tags");
  });
});

describe("item create validation: same rules as an edit, per type (R2)", () => {
  const create = (typeName: string, input: unknown) => itemCreateSchemaFor(typeName).safeParse(input);

  it("needs a title", () => {
    const result = create("note", { title: "  " });

    expect(result.success || fieldErrorsOf(result.error)).toEqual({ title: ITEM_TITLE_REQUIRED });
  });

  it("trims the fields and turns blanks into null", () => {
    expect(create("snippet", { title: " Hook ", description: "  ", content: " code ", language: " ts " }).data).toEqual({
      title: "Hook",
      description: null,
      content: "code",
      language: "ts",
    });
  });

  it("keeps a snippet's or command's content and language", () => {
    expect(create("command", { title: "T", content: "ls", language: "bash" }).data).toMatchObject({
      content: "ls",
      language: "bash",
    });
  });

  it("drops fields the type doesn't use", () => {
    const data = create("note", { title: "T", content: "body", language: "ts", url: "https://x.dev" }).data;

    expect(data).toEqual({ title: "T", content: "body" });
  });

  it("a link needs a URL", () => {
    const result = create("link", { title: "Docs" });

    expect(result.success || fieldErrorsOf(result.error)).toEqual({ url: ITEM_URL_REQUIRED });
  });

  it("a link's URL must be http or https", () => {
    const result = create("link", { title: "Docs", url: "javascript:alert(1)" });

    expect(result.success || fieldErrorsOf(result.error)).toEqual({ url: ITEM_URL_INVALID });
  });

  it("tags are trimmed, blanks dropped and one kept per slug", () => {
    expect(create("note", { title: "T", tags: [" React ", "", "react", "hooks"] }).data?.tags).toEqual(["React", "hooks"]);
  });
});
