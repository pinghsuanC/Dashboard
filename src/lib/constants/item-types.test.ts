import { describe, expect, it } from "vitest";

import { editableFieldsFor } from "./item-types";

describe("editable body fields per item type (E1)", () => {
  it("snippets and commands edit content and language", () => {
    expect(editableFieldsFor("snippet")).toEqual(["content", "language"]);
    expect(editableFieldsFor("command")).toEqual(["content", "language"]);
  });

  it("prompts and notes edit content only", () => {
    expect(editableFieldsFor("prompt")).toEqual(["content"]);
    expect(editableFieldsFor("note")).toEqual(["content"]);
  });

  it("links edit the URL only", () => {
    expect(editableFieldsFor("link")).toEqual(["url"]);
  });

  it("files, images and custom types edit no body field", () => {
    expect(editableFieldsFor("file")).toEqual([]);
    expect(editableFieldsFor("image")).toEqual([]);
    expect(editableFieldsFor("my-custom-type")).toEqual([]);
  });

  it("matches on the type name, not the display label", () => {
    expect(editableFieldsFor("Snippet")).toEqual([]);
  });

  it("a type named like an object property still gets nothing", () => {
    expect(editableFieldsFor("constructor")).toEqual([]);
    expect(editableFieldsFor("toString")).toEqual([]);
  });
});
