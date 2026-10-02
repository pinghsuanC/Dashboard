import { refresh } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { auth } from "@/auth";
import { db, resetDb } from "@/test/fake-prisma";

import { getUserSession, resetProfile } from "./user-session";

// Next's redirect() works by throwing; the tests read the target off the error.
class RedirectError extends Error {
  constructor(readonly url: string) {
    super(`NEXT_REDIRECT ${url}`);
  }
}

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectError(url);
  },
}));
vi.mock("next/cache", () => ({ refresh: vi.fn() }));
// The JWT: only the user id. Everything else is read from the database.
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", async () => ({ prisma: (await import("@/test/fake-prisma")).fakePrisma }));

const signedInAs = (userId: string | null) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- auth() is overloaded; the session shape is all that matters
  vi.mocked(auth as any).mockResolvedValue(userId ? { user: { id: userId } } : null);

/** Runs something that should redirect and returns the target path, without the query. */
const redirectPathOf = async (run: () => Promise<unknown>) => {
  const error = await run().then(
    () => null,
    (thrown: unknown) => thrown,
  );
  expect(error).toBeInstanceOf(RedirectError);
  return new URL((error as RedirectError).url, "http://app.test").pathname;
};

const day = (n: number) => new Date(Date.UTC(2026, 0, n));

beforeEach(() => {
  resetDb();
  vi.mocked(refresh).mockClear();
  db.users.push(
    {
      id: "ada",
      name: "Ada",
      email: "ada@example.test",
      image: null,
      passwordHash: "$2b$secret-hash",
      stripeCustomerId: "cus_secret",
      plan: "PRO",
      preferredTheme: "dark",
      preferredFontSize: 16,
      createdAt: day(1),
    },
    {
      id: "bob",
      name: "Bob",
      email: "bob@example.test",
      image: "https://avatars.example/bob.png",
      passwordHash: null,
      plan: "FREE",
      preferredTheme: "light",
      preferredFontSize: 14,
      createdAt: day(1),
    },
  );
  // Seeded out of display order on purpose; display order is createdAt, then
  // name. Link is added before Command on the same day so the name tie-break
  // is what puts Command first.
  db.itemTypes.push(
    { id: "t-note", name: "note", label: "Note", icon: "StickyNote", color: "#fde047", isSystem: true, userId: null, createdAt: day(3) },
    { id: "t-snippet", name: "snippet", label: "Snippet", icon: "Code", color: "#3b82f6", isSystem: true, userId: null, createdAt: day(1) },
    { id: "t-link", name: "link", label: "Link", icon: "Link", color: "#10b981", isSystem: true, userId: null, createdAt: day(2) },
    { id: "t-command", name: "command", label: "Command", icon: "Terminal", color: "#f97316", isSystem: true, userId: null, createdAt: day(2) },
    // Not system types for everyone: a Pro user's own type, and a stray row
    // flagged isSystem but owned by a user.
    { id: "t-ada-recipe", name: "recipe", label: "Recipe", icon: null, color: "#000000", isSystem: false, userId: "ada", createdAt: day(1) },
    { id: "t-ada-flagged", name: "flagged", label: "Flagged", icon: null, color: "#000000", isSystem: true, userId: "ada", createdAt: day(1) },
  );
});

describe("user session: profile (S1)", () => {
  it("holds the signed-in user's profile", async () => {
    signedInAs("ada");

    const { user } = await getUserSession();

    expect(user).toEqual({
      id: "ada",
      name: "Ada",
      email: "ada@example.test",
      image: null,
      plan: "PRO",
      isPro: true,
      preferredTheme: "dark",
      preferredFontSize: 16,
      createdAt: day(1),
      hasPassword: true,
    });
  });

  it("says whether the user can sign in with a password, for the change-password form", async () => {
    signedInAs("bob");

    expect((await getUserSession()).user.hasPassword).toBe(false);
  });

  it("marks a free user as not Pro", async () => {
    signedInAs("bob");

    expect((await getUserSession()).user.isPro).toBe(false);
  });

  it("never carries the password hash or Stripe ids to the client", async () => {
    signedInAs("ada");

    const serialized = JSON.stringify(await getUserSession());

    expect(serialized).not.toContain("$2b$secret-hash");
    expect(serialized).not.toContain("cus_secret");
  });
});

describe("user session: item types (S2)", () => {
  it("lists only the global system types, in display order, with their routes", async () => {
    signedInAs("ada");

    const { itemTypes } = await getUserSession();

    expect(itemTypes).toEqual([
      { id: "t-snippet", name: "snippet", label: "Snippet", icon: "Code", color: "#3b82f6", route: "/items/snippets" },
      { id: "t-command", name: "command", label: "Command", icon: "Terminal", color: "#f97316", route: "/items/commands" },
      { id: "t-link", name: "link", label: "Link", icon: "Link", color: "#10b981", route: "/items/links" },
      { id: "t-note", name: "note", label: "Note", icon: "StickyNote", color: "#fde047", route: "/items/notes" },
    ]);
  });

  it("keeps counts off the type definitions: they live in itemCounts, kept up separately", async () => {
    signedInAs("ada");
    db.items.push({ id: "i1", userId: "ada", typeId: "t-snippet" });

    const { itemTypes } = await getUserSession();

    for (const type of itemTypes) expect(Object.keys(type)).not.toContain("itemCount");
  });
});

describe("user session: auth guard (S4)", () => {
  it("sends a signed-out request to sign-in", async () => {
    signedInAs(null);

    expect(await redirectPathOf(getUserSession)).toBe("/sign-in");
  });

  it("sends a valid token for a deleted user to sign-in", async () => {
    signedInAs("ghost");

    expect(await redirectPathOf(getUserSession)).toBe("/sign-in");
  });
});

describe("user session: item counts, pinned items and collections (S3)", () => {
  beforeEach(() => {
    // The note joins the React collection first, so ranking by use (two
    // snippets) has to move Snippet ahead of first-seen order.
    db.items.push(
      { id: "a3", userId: "ada", typeId: "t-note", title: "Alpha", isPinned: true, updatedAt: day(7), collectionIds: ["c-react"] },
      {
        id: "a1",
        userId: "ada",
        typeId: "t-snippet",
        title: "useAuth hook",
        description: "Auth context hook",
        content: "export function useAuth() { /* secret body */ }",
        isPinned: true,
        isFavorite: true,
        updatedAt: day(5),
        tags: ["react", "auth", "hooks"],
        collectionIds: ["c-react"],
      },
      { id: "a2", userId: "ada", typeId: "t-snippet", title: "Beta", isPinned: true, updatedAt: day(7), collectionIds: ["c-react"] },
      { id: "a4", userId: "ada", typeId: "t-link", title: "Unpinned", isFavorite: true, updatedAt: day(9), collectionIds: ["c-react"] },
      { id: "b1", userId: "bob", typeId: "t-note", title: "Bob's", isPinned: true, isFavorite: true, updatedAt: day(4), collectionIds: ["c-bob"] },
    );
    db.collections.push(
      { id: "c-react", userId: "ada", name: "React", slug: "react", description: null, isFavorite: true, updatedAt: day(6) },
      { id: "c-empty", userId: "ada", name: "Empty", slug: "empty", description: "Nothing yet", isFavorite: false, updatedAt: day(2) },
      { id: "c-bob", userId: "bob", name: "Bob's", slug: "bobs", description: null, isFavorite: false, updatedAt: day(6) },
    );
  });

  it("holds the signed-in user's item counts: total, favorites and per type", async () => {
    signedInAs("ada");

    const { itemCounts } = await getUserSession();

    expect(itemCounts).toEqual({
      total: 4,
      favorites: 2,
      byType: { "t-snippet": 2, "t-note": 1, "t-link": 1 },
    });
  });

  it("holds every pinned item of the user, newest first, the title breaking ties", async () => {
    signedInAs("ada");

    const { pinnedItems } = await getUserSession();

    expect(pinnedItems.map((item) => item.id)).toEqual(["a3", "a2", "a1"]);
    expect(pinnedItems.find((item) => item.id === "a1")).toEqual({
      id: "a1",
      title: "useAuth hook",
      description: "Auth context hook",
      isPinned: true,
      isFavorite: true,
      updatedAt: day(5),
      tags: ["auth", "hooks", "react"],
      type: { id: "t-snippet", label: "Snippet", icon: "Code", color: "#3b82f6" },
    });
  });

  it("does not hold all items or recent items: the dashboard fetches those per visit", async () => {
    signedInAs("ada");

    const session = await getUserSession();

    expect(Object.keys(session).sort()).toEqual(
      ["collections", "itemCounts", "itemTypes", "pinnedItems", "user"],
    );
  });

  it("leaves item bodies out", async () => {
    signedInAs("ada");

    expect(JSON.stringify(await getUserSession())).not.toContain("secret body");
  });

  it("holds every collection of the user, with its item count and types ranked by use", async () => {
    signedInAs("ada");

    const { collections } = await getUserSession();

    expect(collections).toHaveLength(2);
    expect(collections.find((collection) => collection.id === "c-react")).toEqual({
      id: "c-react",
      name: "React",
      slug: "react",
      description: null,
      isFavorite: true,
      updatedAt: day(6),
      itemCount: 4,
      types: [
        { id: "t-snippet", label: "Snippet", icon: "Code", color: "#3b82f6" },
        { id: "t-note", label: "Note", icon: "StickyNote", color: "#fde047" },
        { id: "t-link", label: "Link", icon: "Link", color: "#10b981" },
      ],
    });
    expect(collections.find((collection) => collection.id === "c-empty")).toMatchObject({
      itemCount: 0,
      types: [],
    });
  });
});

describe("user session: freshness and isolation (S7)", () => {
  it("shows a profile edit on the next request instead of a stale copy", async () => {
    signedInAs("ada");
    await getUserSession();
    db.users[0].name = "Ada Lovelace";

    expect((await getUserSession()).user.name).toBe("Ada Lovelace");
  });

  it("counts a new item on the next load instead of a stale number", async () => {
    signedInAs("ada");
    await getUserSession();
    db.items.push({ id: "a9", userId: "ada", typeId: "t-link", title: "New link", updatedAt: day(9) });

    expect((await getUserSession()).itemCounts.byType["t-link"]).toBe(1);
  });

  it("never hands one user's session to another", async () => {
    signedInAs("ada");
    await getUserSession();
    signedInAs("bob");

    const { user } = await getUserSession();

    expect(user.id).toBe("bob");
    expect(user.email).toBe("bob@example.test");
    expect(user.hasPassword).toBe(false);
  });
});

describe("server-side reset (S6)", () => {
  it("re-renders the current route so the layout reads a fresh session", () => {
    resetProfile();

    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
