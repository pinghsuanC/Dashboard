import { describe, expect, it } from "vitest";

import { editorPreferencesSchema, parseEditorPreferences } from "./editor-preferences";

const DEFAULTS = { fontSize: 12, tabSize: 2, wordWrap: true, minimap: false, theme: "vs-dark" };
const CHOSEN = { fontSize: 16, tabSize: 4, wordWrap: false, minimap: true, theme: "github-dark" };

describe("reading stored editor preferences (EP1)", () => {
  it.each([
    ["an empty object", {}],
    ["null", null],
    ["a string", "vs-dark"],
    ["an array", [16, 4]],
  ])("gives every default for %s", (_label, stored) => {
    expect(parseEditorPreferences(stored)).toEqual(DEFAULTS);
  });

  it("keeps a full set of valid choices", () => {
    expect(parseEditorPreferences(CHOSEN)).toEqual(CHOSEN);
  });

  it("fills only the missing fields with their defaults", () => {
    expect(parseEditorPreferences({ theme: "monokai", minimap: true })).toEqual({
      ...DEFAULTS,
      theme: "monokai",
      minimap: true,
    });
  });

  it("replaces each invalid field with its default and keeps the valid ones", () => {
    expect(
      parseEditorPreferences({
        fontSize: 15, // not offered
        tabSize: "4", // wrong type
        wordWrap: "yes",
        minimap: true,
        theme: "solarized", // removed or never offered
      }),
    ).toEqual({ ...DEFAULTS, minimap: true });
  });

  it("drops keys it does not know", () => {
    expect(parseEditorPreferences({ ...CHOSEN, fontFamily: "Comic Sans" })).toEqual(CHOSEN);
  });
});

describe("validating a save (EP2)", () => {
  it("accepts one of each offered option", () => {
    expect(editorPreferencesSchema.safeParse(CHOSEN)).toEqual({ success: true, data: CHOSEN });
  });

  it("strips unknown keys", () => {
    const parsed = editorPreferencesSchema.safeParse({ ...CHOSEN, userId: "someone-else" });

    expect(parsed.data).toEqual(CHOSEN);
  });

  it.each([
    ["a font size not offered", { fontSize: 15 }],
    ["a tab size not offered", { tabSize: 3 }],
    ["a theme not offered", { theme: "solarized" }],
    ["word wrap that is not a boolean", { wordWrap: "on" }],
    ["minimap that is not a boolean", { minimap: 1 }],
  ])("rejects %s, naming the field", (_label, change) => {
    const parsed = editorPreferencesSchema.safeParse({ ...CHOSEN, ...change });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues.map((issue) => issue.path[0])).toEqual(Object.keys(change));
  });

  it("rejects a save missing a field", () => {
    const withoutTheme: Record<string, unknown> = { ...CHOSEN };
    delete withoutTheme.theme;

    expect(editorPreferencesSchema.safeParse(withoutTheme).success).toBe(false);
  });
});
