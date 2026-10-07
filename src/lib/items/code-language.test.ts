import { describe, expect, it } from "vitest";

import { codeLanguageLabel, monacoLanguageFor } from "./code-language";

describe("item language to Monaco language id (CE2)", () => {
  it("passes a known Monaco id through", () => {
    expect(monacoLanguageFor("typescript")).toBe("typescript");
    expect(monacoLanguageFor("python")).toBe("python");
    expect(monacoLanguageFor("sql")).toBe("sql");
  });

  it("ignores case and surrounding spaces", () => {
    expect(monacoLanguageFor("TypeScript")).toBe("typescript");
    expect(monacoLanguageFor("  Python ")).toBe("python");
  });

  it("maps common aliases", () => {
    expect(monacoLanguageFor("ts")).toBe("typescript");
    expect(monacoLanguageFor("tsx")).toBe("typescript");
    expect(monacoLanguageFor("js")).toBe("javascript");
    expect(monacoLanguageFor("jsx")).toBe("javascript");
    expect(monacoLanguageFor("py")).toBe("python");
    expect(monacoLanguageFor("bash")).toBe("shell");
    expect(monacoLanguageFor("sh")).toBe("shell");
    expect(monacoLanguageFor("zsh")).toBe("shell");
    expect(monacoLanguageFor("yml")).toBe("yaml");
    expect(monacoLanguageFor("md")).toBe("markdown");
  });

  it("falls back to plain text for empty, missing or unknown values", () => {
    expect(monacoLanguageFor("")).toBe("plaintext");
    expect(monacoLanguageFor("   ")).toBe("plaintext");
    expect(monacoLanguageFor(null)).toBe("plaintext");
    expect(monacoLanguageFor(undefined)).toBe("plaintext");
    expect(monacoLanguageFor("brainfuck-2000")).toBe("plaintext");
  });

  it("a language named like an object property falls back to plain text", () => {
    expect(monacoLanguageFor("constructor")).toBe("plaintext");
    expect(monacoLanguageFor("__proto__")).toBe("plaintext");
  });
});

describe("language shown in the editor header (CE3)", () => {
  it("shows the item's language as the user wrote it, trimmed", () => {
    expect(codeLanguageLabel("TypeScript")).toBe("TypeScript");
    expect(codeLanguageLabel("  bash ")).toBe("bash");
  });

  it("shows plain text when there is no language", () => {
    expect(codeLanguageLabel("")).toBe("plain text");
    expect(codeLanguageLabel("  ")).toBe("plain text");
    expect(codeLanguageLabel(null)).toBe("plain text");
  });
});
