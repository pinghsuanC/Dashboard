import { describe, expect, it } from "vitest";

import { DEFAULT_SIGN_IN_REDIRECT, safeCallbackUrl } from "./auth-redirect";

describe("safeCallbackUrl", () => {
  it("R1: keeps a same-site path as given, query and hash included", () => {
    expect(safeCallbackUrl("/profile")).toBe("/profile");
    expect(safeCallbackUrl("/dashboard?type=snippet#top")).toBe("/dashboard?type=snippet#top");
    expect(safeCallbackUrl("/%2F/evil.com")).toBe("/%2F/evil.com");
  });

  it("R1: hands back the path as a browser will read it, stray tabs removed", () => {
    expect(safeCallbackUrl("/pro\tfile")).toBe("/profile");
  });

  it.each([
    ["an absolute URL", "https://evil.com/profile"],
    ["a protocol-relative URL", "//evil.com"],
    ["a backslash read as a slash", "/\\evil.com"],
    ["a tab browsers strip", "/\t/evil.com"],
    ["a newline browsers strip", "/\n/evil.com"],
    ["a carriage return", "/\r/evil.com"],
    ["a bare double slash", "//"],
    ["a relative path", "profile"],
    ["a javascript: URL", "javascript:alert(1)"],
  ])("R2: refuses %s", (_label, value) => {
    expect(safeCallbackUrl(value)).toBe(DEFAULT_SIGN_IN_REDIRECT);
  });

  it("R3: falls back for anything that isn't a string, such as a missing form field", () => {
    expect(safeCallbackUrl(null)).toBe(DEFAULT_SIGN_IN_REDIRECT);
    expect(safeCallbackUrl(undefined)).toBe(DEFAULT_SIGN_IN_REDIRECT);
  });
});
