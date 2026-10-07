import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireCurrentUserId } from "@/services/auth/session";
import { db, resetDb } from "@/test/fake-prisma";

import { getSessionCollections } from "./collections";

class RedirectError extends Error {}

vi.mock("@/services/auth/session", () => ({ requireCurrentUserId: vi.fn() }));
vi.mock("@/services/prisma", async () => ({ prisma: (await import("@/test/fake-prisma")).fakePrisma }));

const updatedAt = new Date("2026-01-01T00:00:00Z");

beforeEach(() => {
  resetDb();
  db.itemTypes.push({ id: "t-note", userId: null, name: "note", label: "Note", icon: null, color: "#888" });
  db.collections.push(
    { id: "c-ada", userId: "ada", name: "Ada's", slug: "adas", description: null, isFavorite: false, updatedAt },
    { id: "c-bob", userId: "bob", name: "Bob's", slug: "bobs", description: null, isFavorite: false, updatedAt },
  );
  db.items.push(
    { id: "a1", userId: "ada", typeId: "t-note", title: "Ada's note", collectionIds: ["c-ada"] },
    { id: "b1", userId: "bob", typeId: "t-note", title: "Bob's note", collectionIds: ["c-bob"] },
  );
  vi.mocked(requireCurrentUserId).mockResolvedValue("ada");
});

describe("getSessionCollections", () => {
  it("C1: returns only the signed-in user's collections, never another user's", async () => {
    const collections = await getSessionCollections();

    expect(collections.map((collection) => collection.id)).toEqual(["c-ada"]);
    expect(collections[0].itemCount).toBe(1);
  });

  it("C2: a signed-out caller is sent away before anything is read", async () => {
    vi.mocked(requireCurrentUserId).mockRejectedValue(new RedirectError("/sign-in"));

    await expect(getSessionCollections()).rejects.toBeInstanceOf(RedirectError);
  });
});
