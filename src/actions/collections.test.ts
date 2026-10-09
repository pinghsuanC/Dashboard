import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { COLLECTION_NAME_REQUIRED, COLLECTION_NAME_TAKEN } from "@/lib/constants/messages/collections";
import { FIELDS_INVALID, SOMETHING_WENT_WRONG } from "@/lib/constants/messages/common";
import { resetProfile } from "@/lib/session/user-session";
import { requireCurrentUserId } from "@/services/auth/session";
import { db, resetDb } from "@/test/fake-prisma";

import { createCollection } from "./collections";

vi.mock("@/services/auth/session", () => ({ requireCurrentUserId: vi.fn() }));
vi.mock("@/services/prisma", async () => ({ prisma: (await import("@/test/fake-prisma")).fakePrisma }));
// Next's refresh() only works inside a real request; the tests check it was asked for.
vi.mock("@/lib/session/user-session", () => ({ resetProfile: vi.fn() }));
vi.spyOn(console, "error").mockImplementation(() => {});

const updatedAt = new Date(Date.UTC(2026, 0, 1));

beforeEach(() => {
  resetDb();
  vi.mocked(resetProfile).mockClear();
  vi.mocked(requireCurrentUserId).mockResolvedValue("ada");
});

describe("createCollection action: success (A1)", () => {
  it("saves the collection for the session user and returns it", async () => {
    const result = await createCollection({ name: " React Patterns ", description: "  ", isFavorite: true });

    expect(result).toEqual({
      success: true,
      data: expect.objectContaining({
        name: "React Patterns",
        slug: "react-patterns",
        description: null,
        isFavorite: true,
        itemCount: 0,
        types: [],
      }),
    });
    expect(db.collections).toEqual([
      expect.objectContaining({ userId: "ada", name: "React Patterns", slug: "react-patterns", description: null }),
    ]);
  });

  it("refreshes the page and session so the sidebar, cards and stats show it", async () => {
    await createCollection({ name: "Docs" });

    expect(resetProfile).toHaveBeenCalledOnce();
  });
});

describe("createCollection action: validation (A2)", () => {
  it("returns field errors and writes nothing", async () => {
    const result = await createCollection({ name: "  " });

    expect(result).toEqual({
      success: false,
      error: { message: FIELDS_INVALID, fieldErrors: { name: COLLECTION_NAME_REQUIRED } },
    });
    expect(db.collections).toHaveLength(0);
    expect(resetProfile).not.toHaveBeenCalled();
  });

  it("input that isn't an object is a validation failure, not a crash", async () => {
    expect(await createCollection("React")).toMatchObject({
      success: false,
      error: { message: FIELDS_INVALID },
    });
  });

  it("ignores an owner sent with the input", async () => {
    await createCollection({ name: "Docs", userId: "bob" });

    expect(db.collections[0].userId).toBe("ada");
  });
});

describe("createCollection action: name taken (A3)", () => {
  it("a name that slugs to one the user has answers a name field error and adds nothing", async () => {
    db.collections.push({ id: "c-react", userId: "ada", name: "React Patterns", slug: "react-patterns", updatedAt });

    expect(await createCollection({ name: "react   patterns!" })).toEqual({
      success: false,
      error: { message: FIELDS_INVALID, fieldErrors: { name: COLLECTION_NAME_TAKEN } },
    });
    expect(db.collections).toHaveLength(1);
    expect(resetProfile).not.toHaveBeenCalled();
  });

  it("another user's collection of the same name doesn't block it", async () => {
    db.collections.push({ id: "c-bob", userId: "bob", name: "React Patterns", slug: "react-patterns", updatedAt });

    expect(await createCollection({ name: "React Patterns" })).toMatchObject({ success: true });
  });
});

describe("createCollection action: failures (A4)", () => {
  it("a database error answers with a retry message", async () => {
    db.down = true;

    expect(await createCollection({ name: "Docs" })).toEqual({
      success: false,
      error: { message: SOMETHING_WENT_WRONG },
    });
    expect(resetProfile).not.toHaveBeenCalled();
  });
});

describe("createCollection action: signed out (A5)", () => {
  it("is redirected to sign in, even with invalid input, and nothing is written", async () => {
    vi.mocked(requireCurrentUserId).mockImplementation(() => redirect("/sign-in"));

    await expect(createCollection({ name: "" })).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_REDIRECT"),
    });
    await expect(createCollection({ name: "Docs" })).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_REDIRECT"),
    });
    expect(db.collections).toHaveLength(0);
  });
});
