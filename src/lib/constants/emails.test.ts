import { describe, expect, it, vi } from "vitest";

import { passwordResetEmail, verificationEmail } from "./emails";

// Lifetimes no real config uses, so a hard-coded "24 hours" or "1 hour" in a
// template can't pass by coincidence.
vi.mock("@/lib/constants/limits", () => ({
  VERIFICATION_TOKEN_TTL_MS: 3 * 60 * 60 * 1000,
  RESET_TOKEN_TTL_MS: 45 * 60 * 1000,
}));

const LINK = "https://stashboard.test/x?token=abc";

describe("emailed links state their real lifetime", () => {
  it("R1: the verification email gives the verification link's lifetime, in text and HTML", () => {
    const email = verificationEmail(LINK);

    expect(email.text).toContain("expires in 3 hours");
    expect(email.html).toContain("expires in 3 hours");
  });

  it("R2: the reset email gives the reset link's lifetime, in text and HTML", () => {
    const email = passwordResetEmail(LINK);

    expect(email.text).toContain("expires in 45 minutes");
    expect(email.html).toContain("expires in 45 minutes");
  });
});

describe("links in email HTML", () => {
  it("R3: a link is escaped in the href, so it can't break out of the attribute", () => {
    const email = verificationEmail('https://x.test/"><script>');

    expect(email.html).toContain('href="https://x.test/&quot;&gt;&lt;script&gt;"');
    expect(email.html).not.toContain("<script>");
  });
});
