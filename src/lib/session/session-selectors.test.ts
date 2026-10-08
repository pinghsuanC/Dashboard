import { describe, expect, it } from "vitest";

import type { SessionCollection } from "@/types/collections";
import type { ItemRowType, ItemSummary } from "@/types/items";

import {
  selectCollectionStats,
  selectItemStats,
  selectPinnedItems,
  selectRecentCollections,
  selectSidebarCollections,
} from "./session-selectors";

const SNIPPET: ItemRowType = { id: "t-snippet", name: "snippet", label: "Snippet", icon: "Code", color: "#3b82f6" };
const NOTE: ItemRowType = { id: "t-note", name: "note", label: "Note", icon: "StickyNote", color: "#fde047" };

const at = (day: number) => new Date(Date.UTC(2026, 0, day));

const item = (id: string, overrides: Partial<ItemSummary> = {}): ItemSummary => ({
  id,
  title: id,
  description: null,
  isPinned: true,
  isFavorite: false,
  updatedAt: at(1),
  tags: [],
  hasFile: false,
  type: SNIPPET,
  ...overrides,
});

const collection = (id: string, overrides: Partial<SessionCollection> = {}): SessionCollection => ({
  id,
  name: id,
  slug: id,
  description: null,
  isFavorite: false,
  updatedAt: at(1),
  itemCount: 0,
  types: [],
  ...overrides,
});

const ids = (rows: { id: string }[]) => rows.map((row) => row.id);

describe("dashboard stats (D1)", () => {
  it("shows the item total and favorites from the session's counts", () => {
    expect(selectItemStats({ total: 42, favorites: 7, byType: {} })).toEqual({
      items: 42,
      favoriteItems: 7,
    });
  });

  it("counts collections and favorite collections", () => {
    const collections = [collection("x", { isFavorite: true }), collection("y")];

    expect(selectCollectionStats(collections)).toEqual({ collections: 2, favoriteCollections: 1 });
  });
});

describe("pinned items (D2)", () => {
  it("lists pinned items newest first, the title breaking ties", () => {
    const items = [
      item("old", { updatedAt: at(1) }),
      item("b-same", { title: "Beta", updatedAt: at(5) }),
      item("a-same", { title: "Alpha", updatedAt: at(5) }),
      item("new", { updatedAt: at(8) }),
    ];

    expect(ids(selectPinnedItems(items))).toEqual(["new", "a-same", "b-same", "old"]);
  });

  it("drops an item unpinned locally, before the session is reloaded", () => {
    const items = [item("kept"), item("unpinned", { isPinned: false })];

    expect(ids(selectPinnedItems(items))).toEqual(["kept"]);
  });

  it("puts an item pinned locally in its place by update time", () => {
    const items = [item("older", { updatedAt: at(1) }), item("newer", { updatedAt: at(2) })];

    expect(ids(selectPinnedItems([...items, item("just-pinned", { updatedAt: at(3) })]))).toEqual(
      ["just-pinned", "newer", "older"],
    );
  });

  it("has no limit: pinning is a deliberate act", () => {
    const items = Array.from({ length: 15 }, (_, n) => item(`p${n}`));

    expect(selectPinnedItems(items)).toHaveLength(15);
  });

  it("does not reorder the session's own list", () => {
    const items = [item("old", { updatedAt: at(1) }), item("new", { updatedAt: at(2) })];

    selectPinnedItems(items);

    expect(ids(items)).toEqual(["old", "new"]);
  });
});

describe("dashboard collections (D5)", () => {
  it("lists the 6 most recently updated collections, the name breaking ties", () => {
    const collections = [
      collection("c1", { updatedAt: at(1) }),
      collection("c2", { updatedAt: at(2) }),
      collection("c3", { updatedAt: at(3) }),
      collection("c4", { updatedAt: at(4) }),
      collection("c5", { updatedAt: at(5) }),
      collection("z-tie", { name: "Zed", updatedAt: at(6) }),
      collection("a-tie", { name: "Abe", updatedAt: at(6) }),
    ];

    expect(ids(selectRecentCollections(collections))).toEqual(
      ["a-tie", "z-tie", "c5", "c4", "c3", "c2"],
    );
  });

  it("keeps each card's item count and types as loaded", () => {
    const [react] = selectRecentCollections([
      collection("react", { itemCount: 4, types: [SNIPPET, NOTE] }),
    ]);

    expect(react).toMatchObject({ itemCount: 4, types: [SNIPPET, NOTE] });
  });

  it("does not reorder the session's own list", () => {
    const collections = [collection("old", { updatedAt: at(1) }), collection("new", { updatedAt: at(2) })];

    selectRecentCollections(collections);

    expect(ids(collections)).toEqual(["old", "new"]);
  });
});

describe("sidebar collections (D6)", () => {
  it("lists every favorite alphabetically, whatever its update time", () => {
    const collections = [
      collection("zed", { name: "Zed", isFavorite: true, updatedAt: at(9) }),
      collection("abe", { name: "Abe", isFavorite: true, updatedAt: at(1) }),
      ...Array.from({ length: 6 }, (_, n) =>
        collection(`fav${n}`, { name: `Mid ${n}`, isFavorite: true }),
      ),
    ];

    const { favorites } = selectSidebarCollections(collections);

    expect(favorites).toHaveLength(8);
    expect(favorites[0].id).toBe("abe");
    expect(favorites.at(-1)?.id).toBe("zed");
  });

  it("lists the 5 newest non-favorites as recents, so nothing appears twice", () => {
    const collections = [
      collection("fav", { isFavorite: true, updatedAt: at(9) }),
      ...Array.from({ length: 6 }, (_, n) => collection(`r${n}`, { updatedAt: at(n + 1) })),
    ];

    const { recents } = selectSidebarCollections(collections);

    expect(ids(recents)).toEqual(["r5", "r4", "r3", "r2", "r1"]);
  });

  it("colours a row with its most-used type, and leaves an empty collection uncoloured", () => {
    const { recents } = selectSidebarCollections([
      collection("mixed", { itemCount: 3, types: [NOTE, SNIPPET] }),
      collection("empty"),
    ]);

    expect(recents.find((row) => row.id === "mixed")).toMatchObject({ itemCount: 3, color: NOTE.color });
    expect(recents.find((row) => row.id === "empty")).toMatchObject({ itemCount: 0, color: null });
  });
});
