import { describe, expect, it } from "vitest";

import { changePasswordSchema } from "./auth-schemas";

const valid = {
  currentPassword: "old-password-1",
  password: "new-password-2",
  confirmPassword: "new-password-2",
};

const accepts = (input: Record<string, unknown>) => changePasswordSchema.safeParse(input).success;

/** The field each failure is reported on, so the form shows it in the right place. */
const errorFields = (input: Record<string, unknown>) => {
  const result = changePasswordSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => String(issue.path[0]));
};

describe("change password input (R1)", () => {
  it("accepts a current password, a new one of 8+ characters, and a matching confirmation", () => {
    expect(accepts(valid)).toBe(true);
  });

  it("requires the current password", () => {
    expect(errorFields({ ...valid, currentPassword: "" })).toContain("currentPassword");
  });

  it("requires the new password to be at least 8 characters", () => {
    expect(errorFields({ ...valid, password: "1234567", confirmPassword: "1234567" })).toContain(
      "password",
    );
    expect(accepts({ ...valid, password: "12345678", confirmPassword: "12345678" })).toBe(true);
  });

  it("requires the confirmation to match, reported on the confirmation", () => {
    expect(errorFields({ ...valid, confirmPassword: "new-password-3" })).toEqual([
      "confirmPassword",
    ]);
  });

  it("rejects a new password equal to the current one, reported on the new password", () => {
    const same = valid.password;
    expect(errorFields({ currentPassword: same, password: same, confirmPassword: same })).toEqual([
      "password",
    ]);
  });

  it("rejects a new password bcrypt would silently truncate (over 72 bytes)", () => {
    // 24 three-byte characters: 72 bytes fits, one more does not.
    const fits = "€".repeat(24);
    const tooLong = "€".repeat(25);
    expect(accepts({ ...valid, password: fits, confirmPassword: fits })).toBe(true);
    expect(errorFields({ ...valid, password: tooLong, confirmPassword: tooLong })).toContain(
      "password",
    );
  });

  it("rejects missing fields, as FormData gives null for an absent input", () => {
    expect(accepts({ currentPassword: null, password: null, confirmPassword: null })).toBe(false);
  });
});
