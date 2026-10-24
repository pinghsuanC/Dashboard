import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CollectionNameTakenError } from "@/lib/collections/collection-errors";
import { COLLECTIONS_PER_PAGE } from "@/lib/constants/limits";
import { PlanLimitError } from "@/lib/billing/billing-errors";
import { PRICING } from "@/lib/constants/pricing";
import { requireCurrentUserId } from "@/services/auth/session";
import { db, fakePrisma, resetDb } from "@/test/fake-prisma";
import { signInOnPlan } from "@/test/fake-session";

import {
  createCollection,
  deleteCollection,
  getCollectionBySlug,
  getCollectionsPage,
  getFavoriteCollections,
  getSessionCollections,
  setCollectionFavorite,
  updateCollection,
} from "./collections";
import { getItemDetail } from "./items";

class RedirectError extends Error {}

vi.mock("@/services/auth/session", () => ({ requireCurrentUserId: vi.fn(), requireCurrentUser: vi.fn() }));
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
  signInOnPlan("FREE");
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

describe("collections page, one page at a time (getCollectionsPage, P1-P3 P7 P8)", () => {
  const day = (n: number) => new Date(Date.UTC(2026, 0, n));
  // `n` collections of Ada's, one day apart, c1 oldest.
  const seed = (n: number) => {
    for (let i = 1; i <= n; i++) {
      db.collections.push({ id: `c${i}`, userId: "ada", name: `Collection ${i}`, slug: `collection-${i}`, description: null, isFavorite: false, updatedAt: day(i) });
    }
  };
  const ids = (page: { rows: { id: string }[] }) => page.rows.map((collection) => collection.id);
  const newest = (from: number, to: number) => Array.from({ length: from - to + 1 }, (_, k) => `c${from - k}`);

  beforeEach(() => {
    db.collections = [];
    db.items = [];
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("P1: page 1 is the newest COLLECTIONS_PER_PAGE collections, with the total and page count", async () => {
    seed(45);

    const page = await getCollectionsPage(1);

    expect(ids(page)).toEqual(newest(45, 45 - COLLECTIONS_PER_PAGE + 1));
    expect(page).toMatchObject({ page: 1, pageCount: 3, total: 45 });
  });

  it("P1: a later page carries on where the one before stopped", async () => {
    seed(45);

    expect(ids(await getCollectionsPage(2))).toEqual(newest(45 - COLLECTIONS_PER_PAGE, 45 - 2 * COLLECTIONS_PER_PAGE + 1));
    expect(ids(await getCollectionsPage(3))).toEqual(newest(45 - 2 * COLLECTIONS_PER_PAGE, 1));
  });

  it("P2: only one page of collections is read from the database", async () => {
    seed(60);
    const findMany = vi.spyOn(fakePrisma.collection, "findMany");

    await getCollectionsPage(2);

    const read = await Promise.all(findMany.mock.results.map((result) => result.value));
    expect(read.length).toBeGreaterThan(0);
    for (const rows of read) expect(rows.length).toBeLessThanOrEqual(COLLECTIONS_PER_PAGE);
  });

  it("P3: a page past the end comes back as asked with no rows; none at all is page 1 of 1", async () => {
    expect(await getCollectionsPage(1)).toEqual({ rows: [], page: 1, pageCount: 1, total: 0 });
    expect(await getCollectionsPage(2)).toEqual({ rows: [], page: 2, pageCount: 1, total: 0 });

    seed(COLLECTIONS_PER_PAGE + 2);

    expect(await getCollectionsPage(9)).toEqual({ rows: [], page: 9, pageCount: 2, total: COLLECTIONS_PER_PAGE + 2 });
    expect(ids(await getCollectionsPage(2))).toEqual(["c2", "c1"]);
  });

  it("P7: another user's collections are neither listed nor counted", async () => {
    seed(2);
    for (let i = 1; i <= 30; i++) {
      db.collections.push({ id: `b${i}`, userId: "bob", name: `Bob ${i}`, slug: `bob-${i}`, updatedAt: day(20) });
    }

    const page = await getCollectionsPage(1);

    expect(ids(page)).toEqual(["c2", "c1"]);
    expect(page).toMatchObject({ pageCount: 1, total: 2 });
  });

  it("P8: collections updated at the same moment are ordered by name, then id, so pages never overlap", async () => {
    for (let i = 1; i <= 30; i++) {
      const id = `same-${String(i).padStart(2, "0")}`;
      // The two with the last ids sort first by name, so the name is what orders them.
      db.collections.push({ id, userId: "ada", name: i > 28 ? `A ${i}` : "Same", slug: id, updatedAt: day(1) });
    }
    db.collections.reverse();

    const both = [...ids(await getCollectionsPage(1)), ...ids(await getCollectionsPage(2))];

    expect(both.slice(0, 2)).toEqual(["same-29", "same-30"]);
    expect(both).toHaveLength(30);
    expect(new Set(both).size).toBe(30);
    expect(both.slice(2)).toEqual([...both.slice(2)].sort());
  });

  it("carries what a collection card shows: item count and types most-used first, never another user's items", async () => {
    db.itemTypes.push({ id: "t-snippet", userId: null, name: "snippet", label: "Snippet", icon: null, color: "#00f" });
    seed(1);
    db.items.push(
      { id: "n1", userId: "ada", typeId: "t-note", title: "Note", collectionIds: ["c1"] },
      { id: "s1", userId: "ada", typeId: "t-snippet", title: "Snip 1", collectionIds: ["c1"] },
      { id: "s2", userId: "ada", typeId: "t-snippet", title: "Snip 2", collectionIds: ["c1"] },
    );

    const [card] = (await getCollectionsPage(1)).rows;

    expect(card).toMatchObject({ id: "c1", name: "Collection 1", slug: "collection-1", description: null, isFavorite: false, itemCount: 3 });
    expect(card.types.map((type) => type.id)).toEqual(["t-snippet", "t-note"]);
    expect(card).not.toHaveProperty("updatedAt");
  });

  it("a signed-out caller is sent away before anything is read", async () => {
    vi.mocked(requireCurrentUserId).mockRejectedValue(new RedirectError("/sign-in"));

    await expect(getCollectionsPage(1)).rejects.toBeInstanceOf(RedirectError);
  });
});

describe("favourite collections for /favorites (getFavoriteCollections)", () => {
  const at = (day: number) => new Date(Date.UTC(2026, 0, day));

  it("FV1: returns only the signed-in user's favourite collections", async () => {
    db.collections.push(
      { id: "c-fav", userId: "ada", name: "Fav", slug: "fav", description: null, isFavorite: true, updatedAt },
      { id: "c-bob-fav", userId: "bob", name: "Bob fav", slug: "bob-fav", description: null, isFavorite: true, updatedAt },
    );

    expect((await getFavoriteCollections()).map((collection) => collection.id)).toEqual(["c-fav"]);
  });

  it("FV2: lists the most recently updated first, the name breaking ties", async () => {
    db.collections.push(
      { id: "c-old", userId: "ada", name: "Old", slug: "old", description: null, isFavorite: true, updatedAt: at(1) },
      { id: "c-beta", userId: "ada", name: "Beta", slug: "beta", description: null, isFavorite: true, updatedAt: at(5) },
      // Its id sorts after "c-beta", so only the name can put it first.
      { id: "c-z-alpha", userId: "ada", name: "Alpha", slug: "alpha", description: null, isFavorite: true, updatedAt: at(5) },
      { id: "c-new", userId: "ada", name: "New", slug: "new", description: null, isFavorite: true, updatedAt: at(9) },
    );

    expect((await getFavoriteCollections()).map((collection) => collection.id)).toEqual(
      ["c-new", "c-z-alpha", "c-beta", "c-old"],
    );
  });

  it("FV3: returns every favourite, not one page of them", async () => {
    for (let n = 1; n <= COLLECTIONS_PER_PAGE + 5; n++) {
      db.collections.push({ id: `c${n}`, userId: "ada", name: `C ${n}`, slug: `c-${n}`, description: null, isFavorite: true, updatedAt: at(n) });
    }

    expect(await getFavoriteCollections()).toHaveLength(COLLECTIONS_PER_PAGE + 5);
  });

  it("FV4: each row carries its item count and most-used type", async () => {
    db.collections.push({ id: "c-fav", userId: "ada", name: "Fav", slug: "fav", description: null, isFavorite: true, updatedAt });
    db.items.push({ id: "a2", userId: "ada", typeId: "t-note", title: "In fav", collectionIds: ["c-fav"] });

    const [collection] = await getFavoriteCollections();

    expect(collection).toMatchObject({ slug: "fav", itemCount: 1, types: [{ name: "note" }] });
  });

  it("FV5: a signed-out caller is sent away before anything is read", async () => {
    vi.mocked(requireCurrentUserId).mockRejectedValue(new RedirectError("/sign-in"));

    await expect(getFavoriteCollections()).rejects.toBeInstanceOf(RedirectError);
  });
});

describe("collection favourite flag (setCollectionFavorite)", () => {
  const row = (id: string) => db.collections.find((collection) => collection.id === id)!;

  it("CF1: sets the flag on and off on the user's collection and answers true", async () => {
    expect(await setCollectionFavorite("c-ada", true)).toBe(true);
    expect(row("c-ada").isFavorite).toBe(true);
    expect(await setCollectionFavorite("c-ada", false)).toBe(true);
    expect(row("c-ada").isFavorite).toBe(false);
  });

  it("CF2: changes only the flag and the update time: name, slug and description stay", async () => {
    const { updatedAt: before, ...fields } = row("c-ada");

    await setCollectionFavorite("c-ada", true);

    const { updatedAt: after, ...saved } = row("c-ada");
    expect(saved).toEqual({ ...fields, isFavorite: true });
    expect(after!.getTime()).toBeGreaterThan(before!.getTime());
  });

  it("CF2: a starred collection becomes the newest favourite, so it reaches the sidebar's capped list", async () => {
    db.collections.push({
      id: "c-ada-new",
      userId: "ada",
      name: "Newer",
      slug: "newer",
      description: null,
      isFavorite: true,
      updatedAt: new Date("2026-02-01T00:00:00Z"),
    });

    await setCollectionFavorite("c-ada", true);

    expect((await getFavoriteCollections()).map((collection) => collection.id)).toEqual(["c-ada", "c-ada-new"]);
  });

  it("CF2: its items stay in it", async () => {
    await setCollectionFavorite("c-ada", true);

    expect(db.items.find((item) => item.id === "a1")?.collectionIds).toEqual(["c-ada"]);
  });

  it("CF3: another user's collection answers false and is left unchanged", async () => {
    expect(await setCollectionFavorite("c-bob", true)).toBe(false);
    expect(row("c-bob").isFavorite).toBe(false);
  });

  it("CF3: a missing collection answers false", async () => {
    expect(await setCollectionFavorite("no-such-collection", true)).toBe(false);
  });

  it("CF4: a signed-out caller is sent away before anything is written", async () => {
    vi.mocked(requireCurrentUserId).mockRejectedValue(new RedirectError("/sign-in"));

    await expect(setCollectionFavorite("c-ada", true)).rejects.toBeInstanceOf(RedirectError);
    expect(row("c-ada").isFavorite).toBe(false);
  });

  it("CF5: a starred collection shows in the favourites list and the session", async () => {
    await setCollectionFavorite("c-ada", true);

    expect((await getFavoriteCollections()).map((collection) => collection.id)).toEqual(["c-ada"]);
    expect(await getSessionCollections()).toEqual([expect.objectContaining({ id: "c-ada", isFavorite: true })]);
  });
});

describe("Free collection limit, counted inside the create (Billing 2: R2, R4)", () => {
  // Ada starts with one collection (c-ada).
  const fillTo = (count: number, userId = "ada") => {
    const have = db.collections.filter((collection) => collection.userId === userId).length;
    for (let n = have; n < count; n++) db.collections.push({ id: `${userId}-c${n}`, userId, name: `C ${n}`, slug: `c-${n}`, updatedAt });
  };

  it("R2: a Free user below the limit can create the last collection", async () => {
    fillTo(PRICING.free.collectionLimit - 1);

    expect(await createCollection({ name: "Last one", description: null, isFavorite: false })).toMatchObject({ name: "Last one" });
  });

  it("R2: at the limit the create throws PlanLimitError and nothing is saved", async () => {
    fillTo(PRICING.free.collectionLimit);
    const before = db.collections.length;

    await expect(createCollection({ name: "One too many", description: null, isFavorite: false })).rejects.toBeInstanceOf(PlanLimitError);
    expect(db.collections).toHaveLength(before);
  });

  it("R2: only the user's own collections count", async () => {
    fillTo(PRICING.free.collectionLimit + 2, "bob");

    expect(await createCollection({ name: "Mine", description: null, isFavorite: false })).toMatchObject({ name: "Mine" });
  });

  it("R4: a Pro user has no collection limit", async () => {
    signInOnPlan("PRO");
    fillTo(PRICING.free.collectionLimit + 2);

    expect(await createCollection({ name: "Unlimited", description: null, isFavorite: false })).toMatchObject({ name: "Unlimited" });
  });
});
