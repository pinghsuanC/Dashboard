import { describe, expect, it } from "vitest";

import type { SessionCollection } from "@/types/collections";
import type { ItemSummary } from "@/types/items";

import {
  collectionSearchKeywords,
  isSearchShortcut,
  itemSearchKeywords,
  ownsSearchShortcut,
  searchScore,
  searchShortcutAction,
  searchShortcutLabel,
} from "./search";

const day = (n: number) => new Date(Date.UTC(2026, 0, n));

const item = (overrides: Partial<ItemSummary> = {}): ItemSummary => ({
  id: "3f2b9c1e-aaaa-4bbb-8ccc-0123456789ab",
  title: "useAuth hook",
  description: null,
  isPinned: false,
  isFavorite: false,
  createdAt: day(1),
  updatedAt: day(1),
  fileName: null,
  fileSize: null,
  tags: [],
  hasFile: false,
  type: { id: "t-snippet", name: "snippet", label: "Snippet", icon: "Code", color: "#3b82f6" },
  ...overrides,
});

const collection = (overrides: Partial<SessionCollection> = {}): SessionCollection => ({
  id: "c-react",
  name: "React Patterns",
  slug: "react-patterns",
  description: null,
  isFavorite: false,
  updatedAt: day(1),
  itemCount: 3,
  types: [],
  ...overrides,
});

const matches = (search: string, keywords: string[]) => searchScore(search, keywords) > 0;

describe("what an item is matched on (GS2)", () => {
  it("GS2: the title, type label, description, file name and tags: what its card shows", () => {
    const keywords = itemSearchKeywords(
      item({ description: "Auth context hook", fileName: "auth.ts", tags: ["react", "hooks"] }),
    );

    for (const search of ["useAuth", "snippet", "context", "auth.ts", "hooks"]) {
      expect(matches(search, keywords), search).toBe(true);
    }
  });

  it("GS2: an image item is found by its file name, the preview's own text", () => {
    const keywords = itemSearchKeywords(
      item({ title: "Diagram", fileName: "login-flow.png", hasFile: true, type: { id: "t-image", name: "image", label: "Image", icon: "Image", color: "#ec4899" } }),
    );

    expect(matches("login-flow", keywords)).toBe(true);
    expect(matches("image", keywords)).toBe(true);
  });

  it("GS2: leaves out empty fields instead of matching the word null", () => {
    expect(itemSearchKeywords(item())).toEqual(["useAuth hook", "Snippet"]);
  });

  it("GS2: never the id, so a uuid fragment finds nothing", () => {
    expect(matches("3f2b9c1e", itemSearchKeywords(item()))).toBe(false);
  });
});

describe("what a collection is matched on (GS2)", () => {
  it("GS2: its name and description", () => {
    const keywords = collectionSearchKeywords(collection({ description: "Hooks and context" }));

    expect(matches("react", keywords)).toBe(true);
    expect(matches("context", keywords)).toBe(true);
  });

  it("GS2: leaves out an empty description, and never the id or slug", () => {
    expect(collectionSearchKeywords(collection())).toEqual(["React Patterns"]);
  });
});

describe("fuzzy matching (GS3)", () => {
  it("GS3: matches letters in order with gaps, ignoring case", () => {
    expect(matches("uah", ["useAuth hook"])).toBe(true);
    expect(matches("USEAUTH", ["useAuth hook"])).toBe(true);
  });

  it("GS3: rejects letters that are not there in order", () => {
    expect(matches("zzz", ["useAuth hook"])).toBe(false);
    expect(matches("kooh", ["useAuth hook"])).toBe(false);
  });

  it("GS3: ranks a closer match higher", () => {
    expect(searchScore("hook", ["useAuth hook"])).toBeGreaterThan(searchScore("hook", ["h o o k s"]));
  });

  it("GS3: fuzzy on the title only; the other fields must contain the search", () => {
    const keywords = ["useDebounce Hook", "Snippets", "Debounce a fast-changing value before using it", "react", "test"];

    expect(matches("dbnc", keywords)).toBe(true);
    expect(matches("fast-chang", keywords)).toBe(true);
    // r-u-s-t is spread over the description and tags, but no field has "rust".
    expect(matches("rust", keywords)).toBe(false);
  });

  it("GS3: ranks a title match above the same word in another field", () => {
    expect(searchScore("rust", ["Rust Notes"])).toBeGreaterThan(searchScore("rust", ["Ownership", "Snippets", "rust"]));
  });

  it("GS3: matches only the search text, ignoring spaces around it", () => {
    expect(matches("  react  ", ["Hooks", "Snippets", "react"])).toBe(true);
    expect(searchScore("", ["Hooks"])).toBe(1);
  });
});

describe("the palette shortcut (GS4)", () => {
  const key = (overrides: Partial<Parameters<typeof isSearchShortcut>[0]> = {}) => ({
    key: "k",
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    repeat: false,
    ...overrides,
  });

  it("GS4: is Cmd+K or Ctrl+K, whatever the caps lock", () => {
    expect(isSearchShortcut(key({ metaKey: true }))).toBe(true);
    expect(isSearchShortcut(key({ ctrlKey: true }))).toBe(true);
    expect(isSearchShortcut(key({ ctrlKey: true, key: "K" }))).toBe(true);
  });

  it("GS4: is not a bare K, another letter, or K with Shift or Alt", () => {
    expect(isSearchShortcut(key())).toBe(false);
    expect(isSearchShortcut(key({ ctrlKey: true, key: "j" }))).toBe(false);
    expect(isSearchShortcut(key({ ctrlKey: true, shiftKey: true }))).toBe(false);
    expect(isSearchShortcut(key({ metaKey: true, altKey: true }))).toBe(false);
  });

  it("GS4: is labelled ⌘K on a Mac and Ctrl K elsewhere", () => {
    expect(searchShortcutLabel("MacIntel")).toBe("⌘K");
    expect(searchShortcutLabel("iPhone")).toBe("⌘K");
    expect(searchShortcutLabel("Win32")).toBe("Ctrl K");
    expect(searchShortcutLabel("Linux x86_64")).toBe("Ctrl K");
  });

  it("GS4: is not a held-down K repeating", () => {
    expect(isSearchShortcut(key({ ctrlKey: true, repeat: true }))).toBe(false);
  });
});

describe("what the shortcut does (GS5)", () => {
  const ctrlK = { key: "k", metaKey: false, ctrlKey: true, altKey: false, shiftKey: false, repeat: false };
  const nothingOpen = { paletteOpen: false, otherDialogOpen: false };
  const paletteOpen = { paletteOpen: true, otherDialogOpen: false };

  it("GS5: opens the palette when nothing is open", () => {
    expect(searchShortcutAction(ctrlK, nothingOpen)).toBe("open");
  });

  it("GS5: closes the palette when it is open", () => {
    expect(searchShortcutAction(ctrlK, paletteOpen)).toBe("close");
  });

  it("GS5: does nothing while the drawer or another dialog is open, so it can't steal their typing or drop an unsaved edit", () => {
    expect(searchShortcutAction(ctrlK, { paletteOpen: false, otherDialogOpen: true })).toBeNull();
  });

  it("GS5: does nothing for another key or a held-down K", () => {
    expect(searchShortcutAction({ ...ctrlK, key: "j" }, nothingOpen)).toBeNull();
    expect(searchShortcutAction({ ...ctrlK, repeat: true }, nothingOpen)).toBeNull();
    expect(searchShortcutAction({ ...ctrlK, repeat: true }, paletteOpen)).toBeNull();
  });
});

describe("the browser's own Ctrl+K (GS6)", () => {
  const ctrlK = { key: "k", metaKey: false, ctrlKey: true, altKey: false, shiftKey: false, repeat: false };

  it("GS6: is always taken from the browser, even when the palette ignores the key", () => {
    expect(ownsSearchShortcut(ctrlK)).toBe(true);
    expect(ownsSearchShortcut({ ...ctrlK, ctrlKey: false, metaKey: true })).toBe(true);
    // Held down, or pressed while another dialog is open: the palette does nothing, the browser still mustn't.
    expect(ownsSearchShortcut({ ...ctrlK, repeat: true })).toBe(true);
    expect(searchShortcutAction(ctrlK, { paletteOpen: false, otherDialogOpen: true })).toBeNull();
  });

  it("GS6: leaves other shortcuts to the browser", () => {
    expect(ownsSearchShortcut({ ...ctrlK, ctrlKey: false })).toBe(false);
    expect(ownsSearchShortcut({ ...ctrlK, key: "l" })).toBe(false);
    expect(ownsSearchShortcut({ ...ctrlK, shiftKey: true })).toBe(false);
    expect(ownsSearchShortcut({ ...ctrlK, altKey: true })).toBe(false);
  });
});
