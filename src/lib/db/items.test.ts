import { beforeEach, describe, expect, it, vi } from "vitest";

import { CollectionNotFoundError } from "@/lib/collections/collection-errors";
import { requireCurrentUserId } from "@/services/auth/session";
import { db, resetDb } from "@/test/fake-prisma";

import {
  createItem,
  deleteItem,
  getCollectionItems,
  getItemDetail,
  getItemFile,
  getItemTypeName,
  getItemsByType,
  getRecentItems,
  setItemFile,
  updateItem,
} from "./items";

vi.mock("@/services/auth/session", () => ({ requireCurrentUserId: vi.fn() }));
vi.mock("@/services/prisma", async () => ({ prisma: (await import("@/test/fake-prisma")).fakePrisma }));

const day = (n: number) => new Date(Date.UTC(2026, 0, n));

beforeEach(() => {
  resetDb();
  vi.mocked(requireCurrentUserId).mockResolvedValue("ada");
  db.itemTypes.push({ id: "t-snippet", name: "snippet", label: "Snippet", icon: "Code", color: "#3b82f6", isSystem: true, userId: null });
});

describe("dashboard recent items, fetched per visit (D3)", () => {
  it("returns the user's 10 newest items, pinned or not, newest first", async () => {
    for (let n = 1; n <= 12; n++) {
      db.items.push({ id: `i${n}`, userId: "ada", typeId: "t-snippet", title: `Item ${n}`, isPinned: n === 12, updatedAt: day(n) });
    }

    const items = await getRecentItems();

    expect(items.map((item) => item.id)).toEqual(
      ["i12", "i11", "i10", "i9", "i8", "i7", "i6", "i5", "i4", "i3"],
    );
  });

  it("breaks ties on the update time by title", async () => {
    db.items.push(
      { id: "beta", userId: "ada", typeId: "t-snippet", title: "Beta", updatedAt: day(3) },
      { id: "alpha", userId: "ada", typeId: "t-snippet", title: "Alpha", updatedAt: day(3) },
    );

    expect((await getRecentItems()).map((item) => item.id)).toEqual(["alpha", "beta"]);
  });

  it("never includes another user's items", async () => {
    db.items.push(
      { id: "mine", userId: "ada", typeId: "t-snippet", title: "Mine", updatedAt: day(1) },
      { id: "bobs", userId: "bob", typeId: "t-snippet", title: "Bob's", updatedAt: day(9) },
    );

    expect((await getRecentItems()).map((item) => item.id)).toEqual(["mine"]);
  });

  it("shows a new item on the next visit, since nothing caches it", async () => {
    db.items.push({ id: "old", userId: "ada", typeId: "t-snippet", title: "Old", updatedAt: day(1) });
    await getRecentItems();
    db.items.push({ id: "new", userId: "ada", typeId: "t-snippet", title: "New", updatedAt: day(2) });

    expect((await getRecentItems())[0].id).toBe("new");
  });

  it("leaves item bodies out", async () => {
    db.items.push({ id: "i", userId: "ada", typeId: "t-snippet", title: "I", content: "secret body", updatedAt: day(1) });

    expect(JSON.stringify(await getRecentItems())).not.toContain("secret body");
  });
});

describe("items list view by type (/items/[type])", () => {
  beforeEach(() => {
    db.itemTypes.push({ id: "t-note", name: "note", label: "Notes", icon: "StickyNote", color: "#fde047", isSystem: true, userId: null });
  });

  it("returns only the user's items of the requested type", async () => {
    db.items.push(
      { id: "snip", userId: "ada", typeId: "t-snippet", title: "Snip", updatedAt: day(1) },
      { id: "note", userId: "ada", typeId: "t-note", title: "Note", updatedAt: day(2) },
    );

    expect((await getItemsByType("t-snippet")).map((item) => item.id)).toEqual(["snip"]);
  });

  it("never includes another user's items of that type", async () => {
    db.items.push(
      { id: "mine", userId: "ada", typeId: "t-snippet", title: "Mine", updatedAt: day(1) },
      { id: "bobs", userId: "bob", typeId: "t-snippet", title: "Bob's", updatedAt: day(9) },
    );

    expect((await getItemsByType("t-snippet")).map((item) => item.id)).toEqual(["mine"]);
  });

  it("lists every matching item, newest first, title breaking ties", async () => {
    for (let n = 1; n <= 12; n++) {
      db.items.push({ id: `i${n}`, userId: "ada", typeId: "t-note", title: `Item ${n}`, updatedAt: day(n) });
    }
    db.items.push({ id: "a12", userId: "ada", typeId: "t-note", title: "A tie", updatedAt: day(12) });

    const ids = (await getItemsByType("t-note")).map((item) => item.id);

    expect(ids).toHaveLength(13);
    expect(ids.slice(0, 3)).toEqual(["a12", "i12", "i11"]);
  });

  it("returns an empty list when the user has none of that type", async () => {
    db.items.push({ id: "snip", userId: "ada", typeId: "t-snippet", title: "Snip", updatedAt: day(1) });

    expect(await getItemsByType("t-note")).toEqual([]);
  });

  it("carries the type each card colours its border with, and leaves bodies out", async () => {
    db.items.push({ id: "n", userId: "ada", typeId: "t-note", title: "N", content: "secret body", updatedAt: day(1) });

    const [item] = await getItemsByType("t-note");

    expect(item.type).toEqual({ id: "t-note", name: "note", label: "Notes", icon: "StickyNote", color: "#fde047" });
    expect(JSON.stringify(item)).not.toContain("secret body");
  });
});

describe("image gallery: whether a card has a stored file to show", () => {
  beforeEach(() => {
    db.itemTypes.push({ id: "t-image", name: "image", label: "Images", icon: "Image", color: "#ec4899", isSystem: true, userId: null });
  });

  it("G1: an item with a stored file has hasFile, one whose upload failed does not", async () => {
    db.items.push(
      { id: "shown", userId: "ada", typeId: "t-image", title: "Shown", fileKey: "users/ada/a.png", fileName: "a.png", updatedAt: day(2) },
      { id: "failed", userId: "ada", typeId: "t-image", title: "Failed", updatedAt: day(1) },
    );

    const items = await getItemsByType("t-image");

    expect(items.map(({ id, hasFile }) => ({ id, hasFile }))).toEqual([
      { id: "shown", hasFile: true },
      { id: "failed", hasFile: false },
    ]);
  });

  it("G1: the dashboard lists carry the same flag", async () => {
    db.items.push({ id: "shown", userId: "ada", typeId: "t-image", title: "Shown", fileKey: "users/ada/a.png", updatedAt: day(1) });

    expect((await getRecentItems())[0].hasFile).toBe(true);
  });

  it("G2: never sends the storage key to the browser", async () => {
    db.items.push({ id: "shown", userId: "ada", typeId: "t-image", title: "Shown", fileKey: "users/ada/a.png", updatedAt: day(1) });

    const [item] = await getItemsByType("t-image");

    expect(item).not.toHaveProperty("fileKey");
    expect(JSON.stringify(item)).not.toContain("users/ada/a.png");
  });
});

describe("file list: each row's file name, size and upload date (FL2)", () => {
  beforeEach(() => {
    db.itemTypes.push({ id: "t-file", name: "file", label: "Files", icon: "File", color: "#6b7280", isSystem: true, userId: null });
  });

  it("FL2: a stored file's name, size and upload date come with the list", async () => {
    db.items.push({
      id: "doc",
      userId: "ada",
      typeId: "t-file",
      title: "Spec",
      fileKey: "users/ada/doc.pdf",
      fileName: "spec.pdf",
      fileSize: 2048,
      createdAt: day(3),
      updatedAt: day(4),
    });

    const [item] = await getItemsByType("t-file");

    expect(item).toMatchObject({ fileName: "spec.pdf", fileSize: 2048, createdAt: day(3), hasFile: true });
  });

  it("FL2: an item whose upload failed lists with no name or size", async () => {
    db.items.push({ id: "failed", userId: "ada", typeId: "t-file", title: "Failed", createdAt: day(1), updatedAt: day(1) });

    const [item] = await getItemsByType("t-file");

    expect(item).toMatchObject({ fileName: null, fileSize: null, createdAt: day(1), hasFile: false });
  });

  it("FL2: the row data still never carries the storage key", async () => {
    db.items.push({ id: "doc", userId: "ada", typeId: "t-file", title: "Spec", fileKey: "users/ada/doc.pdf", fileName: "spec.pdf", updatedAt: day(1) });

    const [item] = await getItemsByType("t-file");

    expect(item).not.toHaveProperty("fileKey");
    expect(JSON.stringify(item)).not.toContain("users/ada/doc.pdf");
  });
});

describe("item drawer detail, loaded on click (getItemDetail)", () => {
  beforeEach(() => {
    db.collections.push(
      { id: "c-react", userId: "ada", name: "React Patterns" },
      { id: "c-auth", userId: "ada", name: "Auth" },
    );
  });

  it("R1: returns the owner's item with its body, collections and dates", async () => {
    db.items.push({
      id: "hook",
      userId: "ada",
      typeId: "t-snippet",
      title: "useAuth Hook",
      description: "Custom auth hook",
      content: "export function useAuth() {}",
      language: "typescript",
      isPinned: true,
      isFavorite: true,
      createdAt: day(1),
      updatedAt: day(2),
      tags: ["react", "auth", "hooks"],
      collectionIds: ["c-react", "c-auth"],
    });

    expect(await getItemDetail("hook")).toEqual({
      id: "hook",
      title: "useAuth Hook",
      description: "Custom auth hook",
      content: "export function useAuth() {}",
      language: "typescript",
      url: null,
      fileName: null,
      fileSize: null,
      mimeType: null,
      isPinned: true,
      isFavorite: true,
      createdAt: day(1),
      updatedAt: day(2),
      tags: ["auth", "hooks", "react"],
      hasFile: false,
      type: { id: "t-snippet", name: "snippet", label: "Snippet", icon: "Code", color: "#3b82f6" },
      collections: [
        { id: "c-auth", name: "Auth" },
        { id: "c-react", name: "React Patterns" },
      ],
    });
  });

  it("R1: carries the link and file fields for those item kinds", async () => {
    db.items.push(
      { id: "link", userId: "ada", typeId: "t-snippet", title: "Docs", url: "https://example.com", updatedAt: day(1) },
      { id: "file", userId: "ada", typeId: "t-snippet", title: "Spec", fileName: "spec.pdf", fileSize: 2048, mimeType: "application/pdf", updatedAt: day(1) },
    );

    expect(await getItemDetail("link")).toMatchObject({ url: "https://example.com", content: null });
    expect(await getItemDetail("file")).toMatchObject({ fileName: "spec.pdf", fileSize: 2048, mimeType: "application/pdf" });
  });

  it("R1: an item in no collection has an empty collection list", async () => {
    db.items.push({ id: "loose", userId: "ada", typeId: "t-snippet", title: "Loose", updatedAt: day(1) });

    expect((await getItemDetail("loose"))?.collections).toEqual([]);
  });

  it("R2: returns null for another user's item, even with its exact id", async () => {
    db.items.push({ id: "bobs", userId: "bob", typeId: "t-snippet", title: "Bob's", content: "bob's secret", updatedAt: day(1) });

    expect(await getItemDetail("bobs")).toBeNull();
  });

  it("R3: returns null for an id that doesn't exist", async () => {
    db.items.push({ id: "mine", userId: "ada", typeId: "t-snippet", title: "Mine", updatedAt: day(1) });

    expect(await getItemDetail("no-such-item")).toBeNull();
  });
});

describe("item type name for the edit rules (getItemTypeName)", () => {
  it("Q0: returns the type name of the user's item", async () => {
    db.items.push({ id: "mine", userId: "ada", typeId: "t-snippet", title: "Mine", updatedAt: day(1) });

    expect(await getItemTypeName("mine")).toBe("snippet");
  });

  it("Q0: returns null for another user's item or a missing id", async () => {
    db.items.push({ id: "bobs", userId: "bob", typeId: "t-snippet", title: "Bob's", updatedAt: day(1) });

    expect(await getItemTypeName("bobs")).toBeNull();
    expect(await getItemTypeName("no-such-item")).toBeNull();
  });
});

describe("item edit, saved (updateItem)", () => {
  const itemRow = (id: string) => db.items.find((item) => item.id === id)!;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(day(20));
    db.collections.push({ id: "c-react", userId: "ada", name: "React Patterns" });
    db.items.push({
      id: "hook",
      userId: "ada",
      typeId: "t-snippet",
      title: "useAuth Hook",
      description: "Custom auth hook",
      content: "old body",
      language: "javascript",
      url: null,
      isPinned: true,
      isFavorite: false,
      createdAt: day(1),
      updatedAt: day(2),
      tags: ["auth"],
      collectionIds: ["c-react"],
    });
    db.tags.push({ id: "tag-auth", userId: "ada", name: "auth", slug: "auth" });
    return () => vi.useRealTimers();
  });

  it("Q1: writes the edit to the user's item", async () => {
    await updateItem("hook", { title: "useSession Hook", description: null, content: "new body", language: "typescript" });

    expect(itemRow("hook")).toMatchObject({
      title: "useSession Hook",
      description: null,
      content: "new body",
      language: "typescript",
    });
  });

  it("Q1: returns the saved item as the drawer shows it, with a new update time", async () => {
    const saved = await updateItem("hook", { title: "useSession Hook", tags: ["auth", "react"] });

    expect(saved).toEqual({
      id: "hook",
      title: "useSession Hook",
      description: "Custom auth hook",
      content: "old body",
      language: "javascript",
      url: null,
      fileName: null,
      fileSize: null,
      mimeType: null,
      isPinned: true,
      isFavorite: false,
      createdAt: day(1),
      updatedAt: day(20),
      tags: ["auth", "react"],
      hasFile: false,
      type: { id: "t-snippet", name: "snippet", label: "Snippet", icon: "Code", color: "#3b82f6" },
      collections: [{ id: "c-react", name: "React Patterns" }],
    });
  });

  it("Q2: leaves fields the edit didn't send untouched", async () => {
    await updateItem("hook", { title: "Renamed" });

    expect(itemRow("hook")).toMatchObject({
      description: "Custom auth hook",
      content: "old body",
      language: "javascript",
      tags: ["auth"],
    });
  });

  it("Q3: returns null for another user's item and changes nothing", async () => {
    db.items.push({ id: "bobs", userId: "bob", typeId: "t-snippet", title: "Bob's", tags: ["bob"], updatedAt: day(1) });

    expect(await updateItem("bobs", { title: "Hijacked", tags: ["pwned"] })).toBeNull();
    expect(itemRow("bobs")).toMatchObject({ title: "Bob's", tags: ["bob"], updatedAt: day(1) });
    expect(db.tags.map((tag) => tag.slug)).toEqual(["auth"]);
  });

  it("Q3: returns null for an id that doesn't exist", async () => {
    expect(await updateItem("no-such-item", { title: "Ghost" })).toBeNull();
  });

  it("Q4: replaces the item's tags with the new list", async () => {
    await updateItem("hook", { title: "useAuth Hook", tags: ["react", "hooks"] });

    expect(itemRow("hook").tags).toEqual(["react", "hooks"]);
  });

  it("Q4: an empty list removes every tag", async () => {
    await updateItem("hook", { title: "useAuth Hook", tags: [] });

    expect(itemRow("hook").tags).toEqual([]);
  });

  it("Q5: reuses the user's tag with the same slug and keeps its stored name", async () => {
    db.tags.push({ id: "tag-react", userId: "ada", name: "React", slug: "react" });

    const saved = await updateItem("hook", { title: "useAuth Hook", tags: ["react"] });

    expect(saved?.tags).toEqual(["React"]);
    expect(db.tags.filter((tag) => tag.slug === "react")).toHaveLength(1);
  });

  it("Q6: creates a tag the user doesn't have, with its slug", async () => {
    await updateItem("hook", { title: "useAuth Hook", tags: ["Next.js"] });

    expect(db.tags).toContainEqual(expect.objectContaining({ userId: "ada", name: "Next.js", slug: "next-js" }));
  });

  it("Q6: never links another user's tag, even with the same slug", async () => {
    db.tags.push({ id: "tag-bob-react", userId: "bob", name: "REACT", slug: "react" });

    const saved = await updateItem("hook", { title: "useAuth Hook", tags: ["react"] });

    expect(saved?.tags).toEqual(["react"]);
    expect(db.tags.filter((tag) => tag.slug === "react").map((tag) => tag.userId).sort()).toEqual(["ada", "bob"]);
  });
});

describe("item delete, scoped to the user (deleteItem, R1)", () => {
  beforeEach(() => {
    db.items.push(
      { id: "mine", userId: "ada", typeId: "t-snippet", title: "Mine", updatedAt: day(1) },
      { id: "other", userId: "ada", typeId: "t-snippet", title: "Other", updatedAt: day(1) },
      { id: "bobs", userId: "bob", typeId: "t-snippet", title: "Bob's", updatedAt: day(1) },
    );
  });

  it("deletes the user's item and answers what it removed", async () => {
    expect(await deleteItem("mine")).toEqual({ fileKey: null });
    expect(db.items.map((item) => item.id)).toEqual(["other", "bobs"]);
  });

  it("another user's item is left alone and answers null", async () => {
    expect(await deleteItem("bobs")).toBeNull();
    expect(db.items.map((item) => item.id)).toContain("bobs");
  });

  it("a missing id deletes nothing and answers null", async () => {
    expect(await deleteItem("no-such-item")).toBeNull();
    expect(db.items).toHaveLength(3);
  });
});

// The fake keeps tag and collection links on the item row, so their removal
// can't be asserted here; the cascade itself is `onDelete: Cascade` in the schema.
describe("item delete, collections stay (deleteItem, R6)", () => {
  it("keeps the user's collections", async () => {
    db.collections.push({ id: "c-ui", userId: "ada", name: "UI", slug: "ui" });
    db.items.push({ id: "mine", userId: "ada", typeId: "t-snippet", title: "Mine", updatedAt: day(1), collectionIds: ["c-ui"] });

    await deleteItem("mine");

    expect(db.items.some((item) => item.id === "mine")).toBe(false);
    expect(db.collections.map((collection) => collection.id)).toEqual(["c-ui"]);
  });
});

describe("unused tags are deleted with the item or tag edit that left them", () => {
  const tagIds = () => db.tags.map((tag) => tag.id).sort();

  beforeEach(() => {
    db.tags.push(
      { id: "tag-react", userId: "ada", name: "react", slug: "react" },
      { id: "tag-hooks", userId: "ada", name: "hooks", slug: "hooks" },
      { id: "tag-bob-old", userId: "bob", name: "old", slug: "old" },
    );
    db.items.push(
      { id: "hook", userId: "ada", typeId: "t-snippet", title: "Hook", updatedAt: day(1), tags: ["react", "hooks"] },
      { id: "other", userId: "ada", typeId: "t-snippet", title: "Other", updatedAt: day(1), tags: ["react"] },
      { id: "bobs", userId: "bob", typeId: "t-snippet", title: "Bob's", updatedAt: day(1), tags: [] },
    );
  });

  it("R1: deleting an item deletes the tags no item uses any more", async () => {
    await deleteItem("hook");

    expect(tagIds()).not.toContain("tag-hooks");
  });

  it("R2: an edit that sends tags deletes the tags it left unused", async () => {
    await updateItem("hook", { title: "Hook", tags: ["react"] });

    expect(tagIds()).not.toContain("tag-hooks");
  });

  it("R2: the tags the edit links are kept", async () => {
    await updateItem("hook", { title: "Hook", tags: ["state"] });

    expect(db.tags.filter((tag) => tag.userId === "ada").map((tag) => tag.slug).sort()).toEqual(["react", "state"]);
  });

  it("R3: a tag another of the user's items still uses stays", async () => {
    await deleteItem("hook");

    expect(tagIds()).toContain("tag-react");
  });

  it("R4: another user's unused tags are never deleted", async () => {
    await deleteItem("hook");
    await updateItem("other", { title: "Other", tags: [] });

    expect(tagIds()).toContain("tag-bob-old");
  });

  it("R5: deleting another user's item or a missing id deletes no tags", async () => {
    db.tags.push({ id: "tag-ada-unused", userId: "ada", name: "unused", slug: "unused" });

    await deleteItem("bobs");
    await deleteItem("no-such-item");

    expect(tagIds()).toContain("tag-ada-unused");
    expect(tagIds()).toContain("tag-bob-old");
  });

  it("R5: an edit to another user's item or a missing id deletes no tags", async () => {
    db.tags.push({ id: "tag-ada-unused", userId: "ada", name: "unused", slug: "unused" });

    await updateItem("bobs", { title: "Hijacked", tags: [] });
    await updateItem("no-such-item", { title: "Ghost", tags: [] });

    expect(tagIds()).toContain("tag-ada-unused");
  });

  it("R5: an edit that sends no tags deletes no tags", async () => {
    db.tags.push({ id: "tag-ada-unused", userId: "ada", name: "unused", slug: "unused" });

    await updateItem("hook", { title: "Renamed" });

    expect(tagIds()).toContain("tag-ada-unused");
  });
});

describe("item create, saved for the session user (createItem)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(day(20));
    return () => vi.useRealTimers();
  });

  it("R3: writes a new item owned by the session user", async () => {
    await createItem("snippet", { title: "useAuth Hook", content: "body", language: "ts" });

    expect(db.items).toEqual([
      expect.objectContaining({ userId: "ada", typeId: "t-snippet", title: "useAuth Hook", content: "body", language: "ts" }),
    ]);
  });

  it("R3: returns the new item as the drawer shows it, unpinned and not a favorite", async () => {
    const created = await createItem("snippet", { title: "useAuth Hook", description: "Hook", tags: ["auth"] });

    expect(created).toEqual({
      id: expect.any(String),
      title: "useAuth Hook",
      description: "Hook",
      content: null,
      language: null,
      url: null,
      fileName: null,
      fileSize: null,
      mimeType: null,
      isPinned: false,
      isFavorite: false,
      createdAt: day(20),
      updatedAt: day(20),
      tags: ["auth"],
      hasFile: false,
      type: { id: "t-snippet", name: "snippet", label: "Snippet", icon: "Code", color: "#3b82f6" },
      collections: [],
    });
    expect(db.items[0].id).toBe(created?.id);
  });

  it("R3: shows up in the user's lists, and never in another user's", async () => {
    await createItem("snippet", { title: "Mine" });

    expect((await getRecentItems()).map((item) => item.title)).toEqual(["Mine"]);
    vi.mocked(requireCurrentUserId).mockResolvedValue("bob");
    expect(await getRecentItems()).toEqual([]);
  });

  it("R4: reuses the user's tag with the same slug and keeps its stored name", async () => {
    db.tags.push({ id: "tag-react", userId: "ada", name: "React", slug: "react" });

    const created = await createItem("snippet", { title: "T", tags: ["react"] });

    expect(created?.tags).toEqual(["React"]);
    expect(db.tags).toHaveLength(1);
  });

  it("R4: creates a tag the user doesn't have, with its slug", async () => {
    await createItem("snippet", { title: "T", tags: ["Next.js"] });

    expect(db.tags).toEqual([expect.objectContaining({ userId: "ada", name: "Next.js", slug: "next-js" })]);
  });

  it("R4: never links another user's tag, even with the same slug", async () => {
    db.tags.push({ id: "tag-bob-react", userId: "bob", name: "REACT", slug: "react" });

    const created = await createItem("snippet", { title: "T", tags: ["react"] });

    expect(created?.tags).toEqual(["react"]);
    expect(db.tags.map((tag) => tag.userId).sort()).toEqual(["ada", "bob"]);
  });

  it("R5: returns null and writes nothing for a type name with no system type", async () => {
    expect(await createItem("no-such-type", { title: "T" })).toBeNull();
    expect(db.items).toEqual([]);
  });

  it("R5: never uses another user's custom type, even with a system type's name", async () => {
    db.itemTypes.unshift({ id: "t-bob-snippet", name: "snippet", label: "Bob's", color: "#000", isSystem: false, userId: "bob" });

    await createItem("snippet", { title: "T" });

    expect(db.items[0].typeId).toBe("t-snippet");
  });

  it("R5: never uses a type that isn't flagged as a system type", async () => {
    db.itemTypes.length = 0;
    db.itemTypes.push({ id: "t-loose", name: "snippet", label: "Loose", color: "#000", isSystem: false, userId: null });

    expect(await createItem("snippet", { title: "T" })).toBeNull();
    expect(db.items).toEqual([]);
  });

  it("R5: never uses a user-owned row flagged as a system type", async () => {
    db.itemTypes.length = 0;
    db.itemTypes.push({ id: "t-bob-snippet", name: "snippet", label: "Bob's", color: "#000", isSystem: true, userId: "bob" });

    expect(await createItem("snippet", { title: "T" })).toBeNull();
    expect(db.items).toEqual([]);
  });
});

describe("file and image items: the stored file's key (F6)", () => {
  beforeEach(() => {
    db.itemTypes.push({ id: "t-image", name: "image", label: "Images", color: "#ec4899", isSystem: true, userId: null });
    db.items.push(
      { id: "pic", userId: "ada", typeId: "t-image", title: "Pic", fileKey: "users/ada/u1.png", fileName: "pic.png", fileSize: 10, mimeType: "image/png", updatedAt: day(1) },
      { id: "bobs-pic", userId: "bob", typeId: "t-image", title: "Bob's", fileKey: "users/bob/u2.png", fileName: "b.png", fileSize: 20, mimeType: "image/png", updatedAt: day(1) },
      { id: "text", userId: "ada", typeId: "t-snippet", title: "Text", updatedAt: day(1) },
    );
  });

  it("deleting a file item answers its key, so the caller can delete the stored file", async () => {
    expect(await deleteItem("pic")).toEqual({ fileKey: "users/ada/u1.png" });
    expect(db.items.map((item) => item.id)).toEqual(["bobs-pic", "text"]);
  });

  it("deleting another user's file item answers null and leaves it", async () => {
    expect(await deleteItem("bobs-pic")).toBeNull();
    expect(db.items.map((item) => item.id)).toContain("bobs-pic");
  });

  it("getItemFile gives the file route the item type, key, name, type and size", async () => {
    expect(await getItemFile("pic")).toEqual({
      typeName: "image",
      fileKey: "users/ada/u1.png",
      fileName: "pic.png",
      mimeType: "image/png",
      fileSize: 10,
    });
  });

  it("getItemFile answers null for another user's item, a missing one, and one with no file", async () => {
    expect(await getItemFile("bobs-pic")).toBeNull();
    expect(await getItemFile("no-such-item")).toBeNull();
    expect(await getItemFile("text")).toBeNull();
  });

  it("the drawer's detail never carries the key", async () => {
    expect(await getItemDetail("pic")).not.toHaveProperty("fileKey");
  });

  it("setItemFile writes a saved item's file details and returns it as the drawer shows it", async () => {
    db.items.push({ id: "new-pic", userId: "ada", typeId: "t-image", title: "New", updatedAt: day(1) });

    const saved = await setItemFile("new-pic", {
      fileKey: "users/ada/u4.png",
      fileName: "new.png",
      fileSize: 42,
      mimeType: "image/png",
    });

    expect(saved).toMatchObject({ id: "new-pic", fileName: "new.png", fileSize: 42, mimeType: "image/png" });
    expect(saved).not.toHaveProperty("fileKey");
    expect(db.items.find((item) => item.id === "new-pic")).toMatchObject({ fileKey: "users/ada/u4.png" });
  });

  it("setItemFile leaves another user's item alone and answers null", async () => {
    const result = await setItemFile("bobs-pic", {
      fileKey: "users/ada/u5.png",
      fileName: "x.png",
      fileSize: 1,
      mimeType: "image/png",
    });

    expect(result).toBeNull();
    expect(db.items.find((item) => item.id === "bobs-pic")).toMatchObject({ fileKey: "users/bob/u2.png" });
  });

  it("creating a file item saves its key and file details", async () => {
    await createItem("image", {
      title: "Logo",
      fileKey: "users/ada/u3.svg",
      fileName: "logo.svg",
      fileSize: 300,
      mimeType: "image/svg+xml",
    });

    expect(db.items.at(-1)).toMatchObject({
      userId: "ada",
      typeId: "t-image",
      fileKey: "users/ada/u3.svg",
      fileName: "logo.svg",
      fileSize: 300,
      mimeType: "image/svg+xml",
    });
  });
});

describe("item collections: linked on create and edit (C2-C4)", () => {
  const itemRow = (id: string) => db.items.find((item) => item.id === id)!;

  beforeEach(() => {
    db.collections.push(
      { id: "c-react", userId: "ada", name: "React Patterns" },
      { id: "c-ai", userId: "ada", name: "AI Prompts" },
      { id: "c-bobs", userId: "bob", name: "Bob's" },
    );
    db.items.push({ id: "hook", userId: "ada", typeId: "t-snippet", title: "Hook", tags: [], collectionIds: ["c-react"] });
  });

  it("C2: a new item with no collections is in none", async () => {
    const item = await createItem("snippet", { title: "T" });

    expect(item?.collections).toEqual([]);
  });

  it("C2: a new item is linked to each chosen collection, one or many", async () => {
    const one = await createItem("snippet", { title: "One", collectionIds: ["c-ai"] });
    const many = await createItem("snippet", { title: "Many", collectionIds: ["c-react", "c-ai"] });

    expect(itemRow(one!.id).collectionIds).toEqual(["c-ai"]);
    expect(many?.collections).toEqual([
      { id: "c-ai", name: "AI Prompts" },
      { id: "c-react", name: "React Patterns" },
    ]);
  });

  it("C3: an edit replaces the item's collections with the chosen ones", async () => {
    const item = await updateItem("hook", { title: "Hook", collectionIds: ["c-ai"] });

    expect(itemRow("hook").collectionIds).toEqual(["c-ai"]);
    expect(item?.collections).toEqual([{ id: "c-ai", name: "AI Prompts" }]);
  });

  it("C3: an edit can keep a collection and add another", async () => {
    await updateItem("hook", { title: "Hook", collectionIds: ["c-react", "c-ai"] });

    expect(itemRow("hook").collectionIds).toEqual(["c-react", "c-ai"]);
  });

  it("C3: an empty list takes the item out of every collection, and the collections stay", async () => {
    await updateItem("hook", { title: "Hook", collectionIds: [] });

    expect(itemRow("hook").collectionIds).toEqual([]);
    expect(db.collections).toHaveLength(3);
  });

  it("C3: an edit that leaves the ids out keeps the item's collections", async () => {
    await updateItem("hook", { title: "Renamed" });

    expect(itemRow("hook").collectionIds).toEqual(["c-react"]);
  });

  it("C4: a create naming another user's collection is refused and saves no item", async () => {
    await expect(createItem("snippet", { title: "T", collectionIds: ["c-ai", "c-bobs"] })).rejects.toBeInstanceOf(
      CollectionNotFoundError,
    );
    expect(db.items.map((item) => item.id)).toEqual(["hook"]);
  });

  it("C4: a create naming a missing collection is refused the same way", async () => {
    await expect(createItem("snippet", { title: "T", collectionIds: ["no-such"] })).rejects.toBeInstanceOf(
      CollectionNotFoundError,
    );
    expect(db.items).toHaveLength(1);
  });

  it("C4: an edit naming another user's or a missing collection changes nothing", async () => {
    for (const id of ["c-bobs", "no-such"]) {
      await expect(updateItem("hook", { title: "Changed", collectionIds: [id] })).rejects.toBeInstanceOf(
        CollectionNotFoundError,
      );
    }
    expect(itemRow("hook")).toMatchObject({ title: "Hook", collectionIds: ["c-react"] });
  });

  it("C4: an edit to another user's item stays not found, even with valid collections", async () => {
    db.items.push({ id: "bobs-item", userId: "bob", typeId: "t-snippet", title: "B", collectionIds: [] });

    expect(await updateItem("bobs-item", { title: "B", collectionIds: ["c-react"] })).toBeNull();
    expect(itemRow("bobs-item").collectionIds).toEqual([]);
  });
});

describe("collection page items (getCollectionItems, CP3)", () => {
  beforeEach(() => {
    db.collections.push(
      { id: "c-ada", userId: "ada", name: "Ada's", slug: "adas" },
      { id: "c-other", userId: "ada", name: "Other", slug: "other" },
      { id: "c-bob", userId: "bob", name: "Bob's", slug: "bobs" },
    );
    db.items.push(
      { id: "old", userId: "ada", typeId: "t-snippet", title: "Old", collectionIds: ["c-ada"], updatedAt: day(1) },
      { id: "new", userId: "ada", typeId: "t-snippet", title: "New", collectionIds: ["c-ada", "c-other"], updatedAt: day(5) },
      { id: "beta", userId: "ada", typeId: "t-snippet", title: "Beta", collectionIds: ["c-ada"], updatedAt: day(3) },
      { id: "alpha", userId: "ada", typeId: "t-snippet", title: "Alpha", collectionIds: ["c-ada"], updatedAt: day(3) },
      { id: "elsewhere", userId: "ada", typeId: "t-snippet", title: "Elsewhere", collectionIds: ["c-other"], updatedAt: day(9) },
      { id: "loose", userId: "ada", typeId: "t-snippet", title: "Loose", updatedAt: day(9) },
      { id: "bobs", userId: "bob", typeId: "t-snippet", title: "Bob's", collectionIds: ["c-bob"], updatedAt: day(9) },
    );
  });

  it("CP3: returns the collection's items, newest first, title breaking ties", async () => {
    expect((await getCollectionItems("c-ada")).map((item) => item.id)).toEqual(["new", "alpha", "beta", "old"]);
  });

  it("CP3: an item in several collections shows in each of them", async () => {
    expect((await getCollectionItems("c-other")).map((item) => item.id)).toEqual(["elsewhere", "new"]);
  });

  it("CP4: another user's collection id lists nothing, even with its exact id", async () => {
    expect(await getCollectionItems("c-bob")).toEqual([]);
    // Bob, who owns it, gets his item: the empty list above is the user scope.
    vi.mocked(requireCurrentUserId).mockResolvedValue("bob");
    expect((await getCollectionItems("c-bob")).map((item) => item.id)).toEqual(["bobs"]);
  });

  it("CP3: carries what the item cards show, without bodies or the storage key", async () => {
    db.items.push({
      id: "file",
      userId: "ada",
      typeId: "t-snippet",
      title: "With file",
      content: "body",
      fileKey: "users/ada/x.png",
      fileName: "x.png",
      collectionIds: ["c-ada"],
      updatedAt: day(20),
    });

    const [item] = await getCollectionItems("c-ada");

    expect(item).toMatchObject({ id: "file", title: "With file", hasFile: true, fileName: "x.png", type: { id: "t-snippet", color: "#3b82f6" } });
    expect(item).not.toHaveProperty("content");
    expect(item).not.toHaveProperty("fileKey");
  });
});
