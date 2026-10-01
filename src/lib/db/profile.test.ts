import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireCurrentUserId } from "@/lib/db/current-user";
import { db, resetDb } from "@/test/fake-prisma";

import { getProfileDetails } from "./profile";

vi.mock("@/lib/db/current-user", () => ({ requireCurrentUserId: vi.fn() }));
vi.mock("@/lib/prisma", async () => ({ prisma: (await import("@/test/fake-prisma")).fakePrisma }));

const createdAt = new Date("2025-03-04T05:06:07Z");

beforeEach(() => {
  resetDb();
  db.users.push(
    { id: "ada", name: "Ada", email: "ada@example.test", passwordHash: "$2b$hash", createdAt },
    { id: "octo", name: null, email: "octo@example.test", passwordHash: null, createdAt },
  );
});

describe("profile details (R8)", () => {
  it("says an email/password user has a password, with their join date", async () => {
    vi.mocked(requireCurrentUserId).mockResolvedValue("ada");

    expect(await getProfileDetails()).toEqual({ createdAt, hasPassword: true });
  });

  it("says a GitHub-only user has no password, so the change form stays hidden", async () => {
    vi.mocked(requireCurrentUserId).mockResolvedValue("octo");

    expect((await getProfileDetails()).hasPassword).toBe(false);
  });

  it("never hands the password hash to the page", async () => {
    vi.mocked(requireCurrentUserId).mockResolvedValue("ada");

    const details = await getProfileDetails();

    expect(JSON.stringify(details)).not.toContain("$2b$hash");
  });
});
