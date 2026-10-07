import { compare, hash } from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireCurrentUserId } from "@/services/auth/session";
import { db, resetDb } from "@/test/fake-prisma";

import { changePassword } from "./account";

class RedirectError extends Error {}

vi.mock("@/services/auth/session", () => ({ requireCurrentUserId: vi.fn() }));
vi.mock("@/services/prisma", async () => ({ prisma: (await import("@/test/fake-prisma")).fakePrisma }));
vi.mock("@/lib/constants/security", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/constants/security")>()),
  BCRYPT_ROUNDS: 4,
}));
vi.spyOn(console, "error").mockImplementation(() => {});

const OLD = "old-password-1";
const NEW = "new-password-2";

const hashOf = (id: string) => db.users.find((user) => user.id === id)!.passwordHash!;

beforeEach(async () => {
  resetDb();
  for (const id of ["ada", "bob"]) {
    db.users.push({
      id,
      name: id,
      email: `${id}@example.test`,
      passwordHash: await hash(OLD, 4),
      createdAt: new Date("2026-01-01T00:00:00Z"),
    });
  }
  vi.mocked(requireCurrentUserId).mockResolvedValue("ada");
});

describe("changePassword", () => {
  it("P1: changes the signed-in user's password and no one else's", async () => {
    expect(await changePassword(OLD, NEW)).toBe("success");

    expect(await compare(NEW, hashOf("ada"))).toBe(true);
    expect(await compare(OLD, hashOf("bob"))).toBe(true);
  });

  it("P2: takes no user id; the session decides whose password changes", async () => {
    const call = changePassword as (...args: unknown[]) => Promise<string>;

    await call("bob", OLD, NEW);

    expect(await compare(OLD, hashOf("bob"))).toBe(true);
  });

  it("P3: a signed-out caller is sent away before anything changes", async () => {
    vi.mocked(requireCurrentUserId).mockRejectedValue(new RedirectError("/sign-in"));

    await expect(changePassword(OLD, NEW)).rejects.toBeInstanceOf(RedirectError);
    expect(await compare(OLD, hashOf("ada"))).toBe(true);
  });
});
