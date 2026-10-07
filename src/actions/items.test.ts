import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SOMETHING_WENT_WRONG } from "@/lib/constants/messages/common";
import {
  ITEM_NOT_FOUND,
  ITEM_SAVE_INVALID,
  ITEM_TITLE_REQUIRED,
  ITEM_URL_REQUIRED,
} from "@/lib/constants/messages/items";
import { resetProfile } from "@/lib/session/user-session";
import { requireCurrentUserId } from "@/services/auth/session";
import { db, resetDb } from "@/test/fake-prisma";

import { updateItem } from "./items";

vi.mock("@/services/auth/session", () => ({ requireCurrentUserId: vi.fn() }));
vi.mock("@/services/prisma", async () => ({ prisma: (await import("@/test/fake-prisma")).fakePrisma }));
// Next's refresh() only works inside a real request; the tests check it was asked for.
vi.mock("@/lib/session/user-session", () => ({ resetProfile: vi.fn() }));
vi.spyOn(console, "error").mockImplementation(() => {});

const day = (n: number) => new Date(Date.UTC(2026, 0, n));
const itemRow = (id: string) => db.items.find((item) => item.id === id)!;

beforeEach(() => {
  resetDb();
  vi.mocked(resetProfile).mockClear();
  vi.mocked(requireCurrentUserId).mockResolvedValue("ada");
  db.itemTypes.push(
    { id: "t-note", name: "note", label: "Notes", icon: "StickyNote", color: "#fde047", isSystem: true, userId: null },
    { id: "t-link", name: "link", label: "Links", icon: "Link", color: "#10b981", isSystem: true, userId: null },
  );
  db.items.push(
    { id: "note", userId: "ada", typeId: "t-note", title: "Standup", content: "old", url: null, updatedAt: day(1), tags: [] },
    { id: "link", userId: "ada", typeId: "t-link", title: "Docs", url: "https://old.dev", updatedAt: day(1), tags: [] },
  );
});

describe("updateItem action: success (A1)", () => {
  it("saves the edit and returns the saved item", async () => {
    const result = await updateItem("note", { title: " Retro ", content: "new", tags: ["team"] });

    expect(result).toEqual({
      success: true,
      data: expect.objectContaining({ id: "note", title: "Retro", content: "new", tags: ["team"] }),
    });
    expect(itemRow("note")).toMatchObject({ title: "Retro", content: "new", tags: ["team"] });
  });

  it("refreshes the page and session so lists and pinned items show the edit", async () => {
    await updateItem("note", { title: "Retro" });

    expect(resetProfile).toHaveBeenCalledOnce();
  });
});

describe("updateItem action: validation (A2)", () => {
  it("returns field errors and writes nothing", async () => {
    const result = await updateItem("note", { title: "  " });

    expect(result).toEqual({
      success: false,
      error: { message: ITEM_SAVE_INVALID, fieldErrors: { title: ITEM_TITLE_REQUIRED } },
    });
    expect(itemRow("note").title).toBe("Standup");
    expect(resetProfile).not.toHaveBeenCalled();
  });

  it("a link can't lose its URL", async () => {
    const result = await updateItem("link", { title: "Docs", url: "" });

    expect(result).toMatchObject({ success: false, error: { fieldErrors: { url: ITEM_URL_REQUIRED } } });
    expect(itemRow("link").url).toBe("https://old.dev");
  });
});

describe("updateItem action: fields follow the item's type (A3)", () => {
  it("ignores fields the item's type doesn't edit", async () => {
    await updateItem("note", { title: "Standup", url: "https://evil.example", language: "ts" });

    expect(itemRow("note").url).toBeNull();
    expect(itemRow("note").language).toBeUndefined();
  });

  it("a link's URL is saved", async () => {
    await updateItem("link", { title: "Docs", url: "https://new.dev" });

    expect(itemRow("link").url).toBe("https://new.dev");
  });
});

describe("updateItem action: not found (A4)", () => {
  const notFound = { success: false, error: { message: ITEM_NOT_FOUND, code: "not-found" } };

  it("another user's item answers not-found and stays unchanged", async () => {
    db.items.push({ id: "bobs", userId: "bob", typeId: "t-note", title: "Bob's", updatedAt: day(1) });

    expect(await updateItem("bobs", { title: "Hijacked" })).toEqual(notFound);
    expect(itemRow("bobs").title).toBe("Bob's");
  });

  it("a missing id answers the same", async () => {
    expect(await updateItem("no-such-item", { title: "Ghost" })).toEqual(notFound);
  });

  it("an id that isn't a string answers the same", async () => {
    expect(await updateItem(42 as unknown as string, { title: "Ghost" })).toEqual(notFound);
  });

  it("refreshes, so lists drop an item that was deleted elsewhere", async () => {
    await updateItem("no-such-item", { title: "Ghost" });

    expect(resetProfile).toHaveBeenCalledOnce();
  });
});

describe("updateItem action: failures (A5)", () => {
  it("a database error answers with a retry message", async () => {
    db.down = true;

    expect(await updateItem("note", { title: "Retro" })).toEqual({
      success: false,
      error: { message: SOMETHING_WENT_WRONG },
    });
  });

  it("a signed-out user is still redirected to sign in", async () => {
    vi.mocked(requireCurrentUserId).mockImplementation(() => redirect("/sign-in"));

    await expect(updateItem("note", { title: "Retro" })).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_REDIRECT"),
    });
  });
});
