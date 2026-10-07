import { compare } from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { isEmailVerificationEnabled, sendVerificationLink } from "@/lib/auth/email-verification";
import { sendAccountExistsEmail } from "@/services/email";
import { db, resetDb } from "@/test/fake-prisma";

import { registerPasswordUser } from "./register-user";

vi.mock("@/services/prisma", async () => ({ prisma: (await import("@/test/fake-prisma")).fakePrisma }));
vi.mock("@/services/email", () => ({ sendAccountExistsEmail: vi.fn() }));
vi.mock("@/lib/auth/email-verification", () => ({
  isEmailVerificationEnabled: vi.fn(),
  sendVerificationLink: vi.fn(),
}));
vi.mock("@/lib/auth/auth-tokens", () => ({ appOrigin: async () => "https://app.test" }));
vi.spyOn(console, "error").mockImplementation(() => {});

const PASSWORD = "new-password-1";
const input = (email: string) => ({
  name: "Someone",
  email,
  password: PASSWORD,
  confirmPassword: PASSWORD,
});

beforeEach(() => {
  resetDb();
  vi.mocked(sendAccountExistsEmail).mockReset().mockResolvedValue();
  vi.mocked(sendVerificationLink).mockReset().mockResolvedValue();
  vi.mocked(isEmailVerificationEnabled).mockReturnValue(true);
  db.users.push({
    id: "ada",
    name: "Ada",
    email: "Ada@Example.test",
    passwordHash: "$2b$existing-hash",
    createdAt: new Date("2026-01-01T00:00:00Z"),
  });
});

describe("register", () => {
  it("R1: a new email gets an account with a hashed password and a verification link", async () => {
    const result = await registerPasswordUser(input("new@example.test"));

    expect(result).toEqual({ success: true });
    const user = db.users.find((row) => row.email === "new@example.test");
    expect(await compare(PASSWORD, user!.passwordHash!)).toBe(true);
    expect(sendVerificationLink).toHaveBeenCalledWith("new@example.test");
  });

  it("R2: a taken email, in any casing, answers exactly like a new one", async () => {
    const taken = await registerPasswordUser(input("ada@example.test"));
    const fresh = await registerPasswordUser(input("new@example.test"));

    expect(taken).toEqual(fresh);
  });

  it("R2: a taken email creates nothing and leaves the existing account alone", async () => {
    await registerPasswordUser(input("ada@example.test"));

    expect(db.users).toHaveLength(1);
    expect(db.users[0].passwordHash).toBe("$2b$existing-hash");
  });

  it("R3: the owner of a taken email is told, with links to sign in or reset, and gets no verification link", async () => {
    await registerPasswordUser(input("ada@example.test"));

    expect(sendAccountExistsEmail).toHaveBeenCalledWith(
      "Ada@Example.test",
      "https://app.test/sign-in",
      "https://app.test/forgot-password",
    );
    expect(sendVerificationLink).not.toHaveBeenCalled();
  });

  it("R4: with verification off, neither case sends an email", async () => {
    vi.mocked(isEmailVerificationEnabled).mockReturnValue(false);

    const taken = await registerPasswordUser(input("ada@example.test"));
    const fresh = await registerPasswordUser(input("new@example.test"));

    expect(taken).toEqual(fresh);
    expect(sendAccountExistsEmail).not.toHaveBeenCalled();
    expect(sendVerificationLink).not.toHaveBeenCalled();
  });

  it("R5: a failed email doesn't change the answer", async () => {
    vi.mocked(sendAccountExistsEmail).mockRejectedValue(new Error("Resend: down"));

    expect(await registerPasswordUser(input("ada@example.test"))).toEqual({ success: true });
  });

  it("R6: a database failure is reported, not hidden as success", async () => {
    db.down = true;

    expect(await registerPasswordUser(input("new@example.test"))).toMatchObject({
      success: false,
      status: 500,
    });
  });
});
