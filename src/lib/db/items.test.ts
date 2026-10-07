import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireCurrentUserId } from "@/lib/db/current-user";
import { db, resetDb } from "@/test/fake-prisma";

import { getItemDetail, getItemTypeName, getItemsByType, getRecentItems, updateItem } from "./items";

vi.mock("@/lib/db/current-user", () => ({ requireCurrentUserId: vi.fn() }));
vi.mock("@/lib/prisma", async () => ({ prisma: (await import("@/test/fake-prisma")).fakePrisma }));

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
