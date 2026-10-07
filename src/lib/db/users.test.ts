import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireCurrentUserId } from "@/services/auth/session";
import { db, resetDb } from "@/test/fake-prisma";

import { deleteAccount } from "./users";

class RedirectError extends Error {}

vi.mock("@/services/auth/session", () => ({ requireCurrentUserId: vi.fn() }));
vi.mock("@/services/prisma", async () => ({ prisma: (await import("@/test/fake-prisma")).fakePrisma }));
vi.spyOn(console, "error").mockImplementation(() => {});

const addUser = (id: string) =>
  db.users.push({
    id,
    name: id,
    email: `${id}@example.test`,
    passwordHash: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
  });

beforeEach(() => {
  resetDb();
  addUser("ada");
  addUser("bob");
  db.itemTypes.push({ id: "snippet", userId: null });
  db.items.push(
    { id: "ada-1", userId: "ada", typeId: "snippet" },
    { id: "bob-1", userId: "bob", typeId: "snippet" },
  );
  db.verificationTokens.push(
    { identifier: "ada@example.test", token: "v-ada" },
    { identifier: "bob@example.test", token: "v-bob" },
  );
  db.passwordResetTokens.push(
    { email: "ada@example.test", token: "r-ada" },
    { email: "bob@example.test", token: "r-bob" },
  );
  vi.mocked(requireCurrentUserId).mockResolvedValue("ada");
});

describe("deleteAccount", () => {
  it("U1: deletes the signed-in user, their items and their email-keyed tokens", async () => {
    expect(await deleteAccount()).toBe(true);

    expect(db.users.map((user) => user.id)).toEqual(["bob"]);
    expect(db.items.map((item) => item.id)).toEqual(["bob-1"]);
    expect(db.verificationTokens.map((token) => token.token)).toEqual(["v-bob"]);
    expect(db.passwordResetTokens.map((token) => token.token)).toEqual(["r-bob"]);
  });

  it("U2: takes no user id; the session decides whose account goes", async () => {
    const call = deleteAccount as (...args: unknown[]) => Promise<boolean>;

    await call("bob");

    expect(db.users.map((user) => user.id)).toEqual(["bob"]);
  });

  it("U3: a signed-out caller is sent away before anything is deleted", async () => {
    vi.mocked(requireCurrentUserId).mockRejectedValue(new RedirectError("/sign-in"));

    await expect(deleteAccount()).rejects.toBeInstanceOf(RedirectError);
    expect(db.users).toHaveLength(2);
    expect(db.items).toHaveLength(2);
  });

  it("U4: a database failure answers false instead of throwing", async () => {
    db.down = true;

    expect(await deleteAccount()).toBe(false);
  });
});
