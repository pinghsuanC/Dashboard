import { compare, hash } from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EmailNotVerifiedError, RateLimitedError } from "@/lib/auth-errors";
import { isEmailVerificationEnabled } from "@/lib/email-verification";
import { checkRateLimit } from "@/lib/rate-limit";
import { BCRYPT_ROUNDS } from "@/lib/register-user";
import { db, resetDb } from "@/test/fake-prisma";

import { authorizeCredentials } from "./authorize-credentials";

vi.mock("@/lib/prisma", async () => ({ prisma: (await import("@/test/fake-prisma")).fakePrisma }));
vi.mock("@/lib/email-verification", () => ({ isEmailVerificationEnabled: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: vi.fn() }));
// The real bcrypt, watched so a test can see whether a compare ran.
vi.mock("bcryptjs", async (importOriginal) => {
  const bcrypt = await importOriginal<typeof import("bcryptjs")>();
  return { ...bcrypt, compare: vi.fn(bcrypt.compare) };
});

const PASSWORD = "right-password-1";

const RESET = Date.parse("2026-10-03T12:15:00Z");

beforeEach(async () => {
  resetDb();
  vi.mocked(compare).mockClear();
  vi.mocked(isEmailVerificationEnabled).mockReturnValue(true);
  vi.mocked(checkRateLimit).mockReset().mockResolvedValue({ success: true, remaining: 4, reset: RESET });
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

describe("sign-in rate limit", () => {
  const request = new Request("http://localhost/api/auth/callback/credentials", {
    method: "POST",
    headers: { "x-forwarded-for": "1.1.1.1" },
  });

  it("R4: each attempt counts against the sign-in limit for this request's IP and the email", async () => {
    await authorizeCredentials({ email: "ada@example.test", password: "wrong-pass-1" }, request);

    expect(checkRateLimit).toHaveBeenCalledWith("signIn", request.headers, "ada@example.test");
  });

  it("R5: over the limit, even the right password is refused, with the reset time", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ success: false, remaining: 0, reset: RESET });

    const attempt = authorizeCredentials({ email: "ada@example.test", password: PASSWORD }, request);

    await expect(attempt).rejects.toBeInstanceOf(RateLimitedError);
    await expect(attempt).rejects.toMatchObject({ reset: RESET, code: "rate_limited" });
  });

  it("R6: over the limit, an unknown email gets the same refusal as a registered one", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ success: false, remaining: 0, reset: RESET });

    await expect(
      authorizeCredentials({ email: "nobody@example.test", password: PASSWORD }, request),
    ).rejects.toBeInstanceOf(RateLimitedError);
  });

  it("R7: an unknown email still runs a password compare, so it takes as long as a wrong password", async () => {
    expect(await authorizeCredentials({ email: "nobody@example.test", password: PASSWORD })).toBeNull();
    expect(compare).toHaveBeenCalledTimes(1);
    // A real hash at the app's cost: comparing against an empty or cheap one returns at once.
    const dummy = vi.mocked(compare).mock.calls[0][1];
    expect(dummy).toHaveLength(60);
    expect(dummy.slice(4, 7)).toBe(`${BCRYPT_ROUNDS}$`);

    expect(await authorizeCredentials({ email: "octo@example.test", password: PASSWORD })).toBeNull();
    expect(compare).toHaveBeenCalledTimes(2);
  });
});
