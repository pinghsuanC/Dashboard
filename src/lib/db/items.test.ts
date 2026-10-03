import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireCurrentUserId } from "@/lib/db/current-user";
import { db, resetDb } from "@/test/fake-prisma";

import { getItemsByType, getRecentItems } from "./items";

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

    expect(item.type).toEqual({ id: "t-note", label: "Notes", icon: "StickyNote", color: "#fde047" });
    expect(JSON.stringify(item)).not.toContain("secret body");
  });
});
