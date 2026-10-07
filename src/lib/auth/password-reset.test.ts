import { beforeEach, describe, expect, it, vi } from "vitest";

import { db, resetDb } from "@/test/fake-prisma";

import { hashToken } from "./auth-tokens";
import { resetPassword } from "./password-reset";

vi.mock("@/services/prisma", async () => ({ prisma: (await import("@/test/fake-prisma")).fakePrisma }));
vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("@/services/email", () => ({ sendPasswordResetEmail: vi.fn() }));
// Real bcrypt at the lowest cost.
vi.mock("@/lib/constants/security", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/constants/security")>()),
  BCRYPT_ROUNDS: 4,
}));

const LINK_TOKEN = "raw-link-token";
const hour = 60 * 60 * 1000;

const storedVersion = () => db.users[0].sessionVersion ?? 0;

beforeEach(() => {
  resetDb();
  db.users.push({
    id: "ada",
    name: "Ada",
    email: "ada@example.test",
    passwordHash: "$2b$old-hash",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    emailVerified: new Date("2026-01-01T00:00:00Z"),
    sessionVersion: 3,
  });
});

const issueLink = (expires: Date) =>
  db.passwordResetTokens.push({ email: "ada@example.test", token: hashToken(LINK_TOKEN), expires });

describe("reset password", () => {
  it("R1: a successful reset signs out every session issued before it", async () => {
    issueLink(new Date(Date.now() + hour));

    expect(await resetPassword(LINK_TOKEN, "new-password-1")).toBe("success");
    expect(storedVersion()).toBe(4);
    expect(db.users[0].passwordHash).not.toBe("$2b$old-hash");
  });

  it("R2: an expired link signs nobody out", async () => {
    issueLink(new Date(Date.now() - hour));

    expect(await resetPassword(LINK_TOKEN, "new-password-1")).toBe("expired");
    expect(storedVersion()).toBe(3);
  });

  it("R2: a used or unknown link signs nobody out", async () => {
    expect(await resetPassword(LINK_TOKEN, "new-password-1")).toBe("invalid");
    expect(storedVersion()).toBe(3);
  });
});
