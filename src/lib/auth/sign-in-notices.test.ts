import { describe, expect, it } from "vitest";

import { SIGN_IN_ERROR_DEFAULT } from "@/lib/constants/messages/auth";

import { signInErrorMessage, verifyNotice } from "./sign-in-notices";

// Every own and inherited name a plain object answers to.
const PROTOTYPE_NAMES = ["toString", "constructor", "__proto__", "hasOwnProperty", "valueOf"];

describe("sign-in error from ?error=", () => {
  it("R1: a known Auth.js code gets its own message", () => {
    expect(signInErrorMessage("OAuthAccountNotLinked")).toMatch(/already exists/);
  });

  it("R1: no code means no error", () => {
    expect(signInErrorMessage(undefined)).toBeNull();
    expect(signInErrorMessage("")).toBeNull();
  });

  it.each(PROTOTYPE_NAMES)("R2: %s gets the generic message as a string, not an object member", (code) => {
    expect(signInErrorMessage(code)).toBe(SIGN_IN_ERROR_DEFAULT);
  });
});

describe("verification notice from ?verify=", () => {
  it("R3: each verify-email outcome gets its notice", () => {
    expect(verifyNotice("success")).toMatchObject({ ok: true });
    expect(verifyNotice("expired")).toMatchObject({ ok: false });
    expect(verifyNotice("invalid")).toMatchObject({ ok: false });
  });

  it.each([undefined, "", "bogus", ...PROTOTYPE_NAMES])("R4: %s shows no notice", (code) => {
    expect(verifyNotice(code)).toBeNull();
  });
});
