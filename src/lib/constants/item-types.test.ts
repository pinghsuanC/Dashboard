import { describe, expect, it } from "vitest";

import { CREATABLE_ITEM_TYPE_NAMES, editableFieldsFor, isCreatableItemType } from "./item-types";

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

describe("types the New Item dialog offers (R1)", () => {
  it("lists snippet, prompt, command, note and link, in that order", () => {
    expect(CREATABLE_ITEM_TYPE_NAMES).toEqual(["snippet", "prompt", "command", "note", "link"]);
  });

  it("each of them can be created", () => {
    for (const name of CREATABLE_ITEM_TYPE_NAMES) expect(isCreatableItemType(name)).toBe(true);
  });

  it("files, images and custom types can't be created", () => {
    expect(isCreatableItemType("file")).toBe(false);
    expect(isCreatableItemType("image")).toBe(false);
    expect(isCreatableItemType("my-custom-type")).toBe(false);
  });

  it("matches on the type name, not the display label", () => {
    expect(isCreatableItemType("Snippet")).toBe(false);
  });

  it("a type named like an object or array property can't be created", () => {
    expect(isCreatableItemType("constructor")).toBe(false);
    expect(isCreatableItemType("length")).toBe(false);
  });
});
