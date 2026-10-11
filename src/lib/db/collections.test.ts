import { beforeEach, describe, expect, it, vi } from "vitest";

import { CollectionNameTakenError } from "@/lib/collections/collection-errors";
import { requireCurrentUserId } from "@/services/auth/session";
import { db, resetDb } from "@/test/fake-prisma";

import {
  createCollection,
  deleteCollection,
  getCollectionBySlug,
  getSessionCollections,
  updateCollection,
} from "./collections";
import { getItemDetail } from "./items";

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

describe("collection edit (updateCollection)", () => {
  const fields = { name: "Ada's Notes", description: "Renamed", isFavorite: true };

  it("UC1: saves the fields on the user's collection, re-slugs it from the new name, and returns the header", async () => {
    expect(await updateCollection("c-ada", fields)).toEqual({
      id: "c-ada",
      name: "Ada's Notes",
      slug: "ada-s-notes",
      description: "Renamed",
      isFavorite: true,
    });
    expect(db.collections.find((row) => row.id === "c-ada")).toMatchObject({ ...fields, slug: "ada-s-notes", userId: "ada" });
  });

  it("UC1: its items stay in it", async () => {
    await updateCollection("c-ada", fields);

    expect(db.items.find((item) => item.id === "a1")?.collectionIds).toEqual(["c-ada"]);
  });

  it("UC2: keeping its own name (or one that slugs the same) is not a clash", async () => {
    expect(await updateCollection("c-ada", { name: "ADAS", description: null, isFavorite: false })).toMatchObject({
      slug: "adas",
      name: "ADAS",
    });
  });

  it("UC3: a name that slugs to another of the user's collections throws CollectionNameTakenError and changes nothing", async () => {
    db.collections.push({ id: "c-ada-2", userId: "ada", name: "Docs", slug: "docs", updatedAt });

    await expect(updateCollection("c-ada-2", { name: "ADAS!", description: null, isFavorite: false })).rejects.toBeInstanceOf(
      CollectionNameTakenError,
    );
    expect(db.collections.find((row) => row.id === "c-ada-2")).toMatchObject({ name: "Docs", slug: "docs" });
  });

  it("UC3: another user's collection of the same name doesn't clash", async () => {
    expect(await updateCollection("c-ada", { name: "Bobs", description: null, isFavorite: false })).toMatchObject({
      slug: "bobs",
    });
  });

  it("UC4: another user's collection is not found and is left unchanged", async () => {
    expect(await updateCollection("c-bob", fields)).toBeNull();
    expect(db.collections.find((row) => row.id === "c-bob")).toMatchObject({ name: "Bob's", slug: "bobs", userId: "bob" });
  });

  it("UC4: a missing collection is not found", async () => {
    expect(await updateCollection("no-such-collection", fields)).toBeNull();
  });

  it("UC5: a signed-out caller is sent away before anything is written", async () => {
    vi.mocked(requireCurrentUserId).mockRejectedValue(new RedirectError("/sign-in"));

    await expect(updateCollection("c-ada", fields)).rejects.toBeInstanceOf(RedirectError);
    expect(db.collections.find((row) => row.id === "c-ada")?.name).toBe("Ada's");
  });
});

describe("collection delete (deleteCollection)", () => {
  it("DC1: deletes the user's collection and answers true", async () => {
    expect(await deleteCollection("c-ada")).toBe(true);
    expect(db.collections.map((row) => row.id)).toEqual(["c-bob"]);
  });

  it("DC2: keeps its items, which no longer list it when opened", async () => {
    await deleteCollection("c-ada");

    expect(db.items.map((item) => item.id)).toEqual(["a1", "b1"]);
    expect(await getItemDetail("a1")).toMatchObject({ id: "a1", title: "Ada's note", collections: [] });
  });

  it("DC2: it drops out of the user session's collections", async () => {
    await deleteCollection("c-ada");

    expect(await getSessionCollections()).toEqual([]);
  });

  it("DC3: another user's collection is not found and stays, with its items", async () => {
    expect(await deleteCollection("c-bob")).toBe(false);
    expect(db.collections.map((row) => row.id)).toEqual(["c-ada", "c-bob"]);
    vi.mocked(requireCurrentUserId).mockResolvedValue("bob");
    expect((await getItemDetail("b1"))?.collections).toEqual([{ id: "c-bob", name: "Bob's" }]);
  });

  it("DC3: a missing collection is not found", async () => {
    expect(await deleteCollection("no-such-collection")).toBe(false);
    expect(db.collections).toHaveLength(2);
  });

  it("DC4: a signed-out caller is sent away before anything is deleted", async () => {
    vi.mocked(requireCurrentUserId).mockRejectedValue(new RedirectError("/sign-in"));

    await expect(deleteCollection("c-ada")).rejects.toBeInstanceOf(RedirectError);
    expect(db.collections).toHaveLength(2);
  });
});
