import { hash } from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EmailNotVerifiedError } from "@/lib/auth-errors";
import { isEmailVerificationEnabled } from "@/lib/email-verification";
import { db, resetDb } from "@/test/fake-prisma";

import { authorizeCredentials } from "./authorize-credentials";

vi.mock("@/lib/prisma", async () => ({ prisma: (await import("@/test/fake-prisma")).fakePrisma }));
vi.mock("@/lib/email-verification", () => ({ isEmailVerificationEnabled: vi.fn() }));

const PASSWORD = "right-password-1";

beforeEach(async () => {
  resetDb();
  vi.mocked(isEmailVerificationEnabled).mockReturnValue(true);
  db.users.push(
    {
      id: "ada",
      name: "Ada",
      email: "ada@example.test",
      passwordHash: await hash(PASSWORD, 4),
      emailVerified: new Date("2026-01-01T00:00:00Z"),
      createdAt: new Date("2026-01-01T00:00:00Z"),
      sessionVersion: 3,
    },
    {
      id: "octo",
      name: "Octo",
      email: "octo@example.test",
      passwordHash: null,
      emailVerified: new Date("2026-01-01T00:00:00Z"),
      createdAt: new Date("2026-01-01T00:00:00Z"),
    },
  );
});

describe("credentials sign-in", () => {
  it("R1: the right password signs in, in any email casing, carrying the user's session version", async () => {
    const user = await authorizeCredentials({ email: "ADA@example.test", password: PASSWORD });

    expect(user).toMatchObject({ id: "ada", sessionVersion: 3 });
  });

  it("R2: a wrong password, an unknown email and a GitHub-only account all get the same null", async () => {
    expect(await authorizeCredentials({ email: "ada@example.test", password: "wrong-pass-1" })).toBeNull();
    expect(await authorizeCredentials({ email: "nobody@example.test", password: PASSWORD })).toBeNull();
    expect(await authorizeCredentials({ email: "octo@example.test", password: PASSWORD })).toBeNull();
  });

  it("R3: an unverified email is refused only once the password is right, and only with verification on", async () => {
    db.users[0].emailVerified = null;

    expect(await authorizeCredentials({ email: "ada@example.test", password: "wrong-pass-1" })).toBeNull();
    await expect(
      authorizeCredentials({ email: "ada@example.test", password: PASSWORD }),
    ).rejects.toBeInstanceOf(EmailNotVerifiedError);

    vi.mocked(isEmailVerificationEnabled).mockReturnValue(false);
    expect(await authorizeCredentials({ email: "ada@example.test", password: PASSWORD })).toMatchObject({
      id: "ada",
    });
  });
});
