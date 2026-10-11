import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireCurrentUserId } from "@/services/auth/session";
import { db, resetDb } from "@/test/fake-prisma";

import { createCollection, getCollectionBySlug, getSessionCollections } from "./collections";

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

describe("createCollection", () => {
  const fields = { name: "React Patterns", description: "Hooks and more", isFavorite: true };

  it("D1: stores the collection for the session user, slugged from its name, and returns it as the session holds it", async () => {
    const created = await createCollection(fields);

    expect(created).toEqual({
      id: expect.any(String),
      name: "React Patterns",
      slug: "react-patterns",
      description: "Hooks and more",
      isFavorite: true,
      updatedAt: expect.any(Date),
      itemCount: 0,
      types: [],
    });
    expect(db.collections.find((row) => row.id === created?.id)).toMatchObject({
      userId: "ada",
      slug: "react-patterns",
    });
  });

  it("D2: a name whose slug the user already has answers null and stores nothing", async () => {
    db.collections.push({ id: "c-react", userId: "ada", name: "react patterns", slug: "react-patterns", updatedAt });

    expect(await createCollection(fields)).toBeNull();
    expect(db.collections.filter((row) => row.userId === "ada")).toHaveLength(2);
  });

  it("D3: another user's collection with the same slug doesn't clash", async () => {
    db.collections.push({ id: "c-bob-react", userId: "bob", name: "React Patterns", slug: "react-patterns", updatedAt });

    expect(await createCollection(fields)).toMatchObject({ slug: "react-patterns" });
    expect(db.collections.filter((row) => row.slug === "react-patterns").map((row) => row.userId).sort()).toEqual([
      "ada",
      "bob",
    ]);
  });

  it("D4: a signed-out caller is sent away before anything is written", async () => {
    vi.mocked(requireCurrentUserId).mockRejectedValue(new RedirectError("/sign-in"));

    await expect(createCollection(fields)).rejects.toBeInstanceOf(RedirectError);
    expect(db.collections).toHaveLength(2);
  });

  it("D5: other database errors are thrown, not answered as a clash", async () => {
    db.down = true;

    await expect(createCollection(fields)).rejects.toThrow();
  });
});

describe("collection page header (getCollectionBySlug)", () => {
  beforeEach(() => {
    db.collections.push(
      { id: "c-ada-react", userId: "ada", name: "React Patterns", slug: "react-patterns", description: "Hooks", isFavorite: true, updatedAt },
      { id: "c-bob-react", userId: "bob", name: "Bob's React", slug: "react-patterns", description: "Not Ada's", isFavorite: false, updatedAt },
      { id: "c-bob-only", userId: "bob", name: "Bob only", slug: "bob-only", updatedAt },
    );
  });

  it("CP4: finds the signed-in user's collection by slug, with what the header shows", async () => {
    expect(await getCollectionBySlug("react-patterns")).toEqual({
      id: "c-ada-react",
      name: "React Patterns",
      slug: "react-patterns",
      description: "Hooks",
      isFavorite: true,
    });
  });

  it("CP4: a slug another user also has finds the signed-in user's own collection, never theirs", async () => {
    vi.mocked(requireCurrentUserId).mockResolvedValue("bob");

    expect((await getCollectionBySlug("react-patterns"))?.id).toBe("c-bob-react");
  });

  it("CP4: a slug only another user has finds nothing", async () => {
    expect(await getCollectionBySlug("bob-only")).toBeNull();
    // Bob, who owns it, does find it: the null above is the user scope, not a missing row.
    vi.mocked(requireCurrentUserId).mockResolvedValue("bob");
    expect((await getCollectionBySlug("bob-only"))?.id).toBe("c-bob-only");
  });

  it("CP4: an unknown slug finds nothing", async () => {
    expect(await getCollectionBySlug("no-such-collection")).toBeNull();
  });

  it("CP4: a signed-out caller is sent away before anything is read", async () => {
    vi.mocked(requireCurrentUserId).mockRejectedValue(new RedirectError("/sign-in"));

    await expect(getCollectionBySlug("react-patterns")).rejects.toBeInstanceOf(RedirectError);
  });
});
