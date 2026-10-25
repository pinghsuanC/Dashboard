import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  COLLECTION_NAME_REQUIRED,
  COLLECTION_NAME_TAKEN,
  COLLECTION_NOT_FOUND,
} from "@/lib/constants/messages/collections";
import { FIELDS_INVALID, SOMETHING_WENT_WRONG } from "@/lib/constants/messages/common";
import { COLLECTION_LIMIT_REACHED } from "@/lib/constants/messages/billing";
import { PRICING } from "@/lib/constants/pricing";
import { resetProfile } from "@/lib/session/user-session";
import { requireCurrentUserId } from "@/services/auth/session";
import { db, resetDb } from "@/test/fake-prisma";
import { signInOnPlan } from "@/test/fake-session";

import { createCollection, deleteCollection, setCollectionFavorite, updateCollection } from "./collections";

vi.mock("@/services/auth/session", () => ({ requireCurrentUserId: vi.fn(), requireCurrentUser: vi.fn() }));
vi.mock("@/services/prisma", async () => ({ prisma: (await import("@/test/fake-prisma")).fakePrisma }));
// Next's refresh() only works inside a real request; the tests check it was asked for.
vi.mock("@/lib/session/user-session", () => ({ resetProfile: vi.fn() }));
vi.spyOn(console, "error").mockImplementation(() => {});

const updatedAt = new Date(Date.UTC(2026, 0, 1));
const COLLECTION_NOT_FOUND_RESULT = {
  success: false,
  error: { message: COLLECTION_NOT_FOUND, code: "not-found" },
};

beforeEach(() => {
  resetDb();
  vi.mocked(resetProfile).mockClear();
  vi.mocked(requireCurrentUserId).mockResolvedValue("ada");
  signInOnPlan("FREE");
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

describe("updateCollection action: success (E1)", () => {
  beforeEach(() => {
    db.collections.push({ id: "c-react", userId: "ada", name: "React", slug: "react", description: "Old", isFavorite: false, updatedAt });
  });

  it("saves the validated fields and returns the header with the new slug", async () => {
    const result = await updateCollection("c-react", { name: " React Patterns ", description: "  ", isFavorite: true });

    expect(result).toEqual({
      success: true,
      data: { id: "c-react", name: "React Patterns", slug: "react-patterns", description: null, isFavorite: true },
    });
    expect(db.collections[0]).toMatchObject({ name: "React Patterns", slug: "react-patterns", description: null, isFavorite: true });
  });

  it("refreshes the page and session so the sidebar, cards and stats show the change", async () => {
    await updateCollection("c-react", { name: "React" });

    expect(resetProfile).toHaveBeenCalledOnce();
  });

  it("ignores an owner or slug sent with the input", async () => {
    await updateCollection("c-react", { name: "React", userId: "bob", slug: "hijacked" });

    expect(db.collections[0]).toMatchObject({ userId: "ada", slug: "react" });
  });
});

describe("updateCollection action: validation (E2)", () => {
  beforeEach(() => {
    db.collections.push({ id: "c-react", userId: "ada", name: "React", slug: "react", updatedAt });
  });

  it("returns field errors and writes nothing", async () => {
    expect(await updateCollection("c-react", { name: "  " })).toEqual({
      success: false,
      error: { message: FIELDS_INVALID, fieldErrors: { name: COLLECTION_NAME_REQUIRED } },
    });
    expect(db.collections[0].name).toBe("React");
    expect(resetProfile).not.toHaveBeenCalled();
  });

  it("input that isn't an object is a validation failure, not a crash", async () => {
    expect(await updateCollection("c-react", "React")).toMatchObject({ success: false, error: { message: FIELDS_INVALID } });
  });
});

describe("updateCollection action: name taken (E3)", () => {
  beforeEach(() => {
    db.collections.push(
      { id: "c-react", userId: "ada", name: "React", slug: "react", updatedAt },
      { id: "c-docs", userId: "ada", name: "Docs", slug: "docs", updatedAt },
    );
  });

  it("a name that slugs to another of the user's collections answers a name field error and changes nothing", async () => {
    expect(await updateCollection("c-docs", { name: "REACT!" })).toEqual({
      success: false,
      error: { message: FIELDS_INVALID, fieldErrors: { name: COLLECTION_NAME_TAKEN } },
    });
    expect(db.collections[1]).toMatchObject({ name: "Docs", slug: "docs" });
    expect(resetProfile).not.toHaveBeenCalled();
  });

  it("keeping its own name is fine", async () => {
    expect(await updateCollection("c-react", { name: "React", description: "New" })).toMatchObject({ success: true });
  });
});

describe("updateCollection action: not found (E4)", () => {
  it("another user's collection answers not found, is left unchanged, and refreshes stale lists", async () => {
    db.collections.push({ id: "c-bob", userId: "bob", name: "Bob's", slug: "bobs", updatedAt });

    expect(await updateCollection("c-bob", { name: "Mine now" })).toEqual(COLLECTION_NOT_FOUND_RESULT);
    expect(db.collections[0]).toMatchObject({ name: "Bob's", userId: "bob" });
    expect(resetProfile).toHaveBeenCalledOnce();
  });

  it("a missing collection answers not found", async () => {
    expect(await updateCollection("gone", { name: "Docs" })).toEqual(COLLECTION_NOT_FOUND_RESULT);
  });

  it("an id that isn't a string answers not found without querying", async () => {
    db.down = true;

    expect(await updateCollection(42 as unknown as string, { name: "Docs" })).toEqual(COLLECTION_NOT_FOUND_RESULT);
  });
});

describe("updateCollection action: failures and sign-in (E5)", () => {
  it("a database error answers with a retry message", async () => {
    db.collections.push({ id: "c-react", userId: "ada", name: "React", slug: "react", updatedAt });
    db.down = true;

    expect(await updateCollection("c-react", { name: "Docs" })).toEqual({
      success: false,
      error: { message: SOMETHING_WENT_WRONG },
    });
    expect(resetProfile).not.toHaveBeenCalled();
  });

  it("a signed-out caller is redirected to sign in, even with invalid input", async () => {
    vi.mocked(requireCurrentUserId).mockImplementation(() => redirect("/sign-in"));

    await expect(updateCollection("c-react", { name: "" })).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_REDIRECT"),
    });
  });
});

describe("deleteCollection action (X1–X4)", () => {
  beforeEach(() => {
    db.collections.push(
      { id: "c-react", userId: "ada", name: "React", slug: "react", updatedAt },
      { id: "c-bob", userId: "bob", name: "Bob's", slug: "bobs", updatedAt },
    );
    db.items.push(
      { id: "hook", userId: "ada", typeId: "t-snippet", title: "useAuth", collectionIds: ["c-react"] },
      { id: "bob-note", userId: "bob", typeId: "t-note", title: "Bob's note", collectionIds: ["c-bob"] },
    );
  });

  it("X1: deletes the collection, keeps its items without the link, and refreshes the session", async () => {
    expect(await deleteCollection("c-react")).toEqual({ success: true, data: null });
    expect(db.collections.map((row) => row.id)).toEqual(["c-bob"]);
    expect(db.items.map((item) => item.id)).toEqual(["hook", "bob-note"]);
    expect(db.items[0].collectionIds).toEqual([]);
    expect(resetProfile).toHaveBeenCalledOnce();
  });

  it("X2: another user's collection answers not found and stays with its items", async () => {
    expect(await deleteCollection("c-bob")).toEqual(COLLECTION_NOT_FOUND_RESULT);
    expect(db.collections.map((row) => row.id)).toEqual(["c-react", "c-bob"]);
    expect(db.items[1].collectionIds).toEqual(["c-bob"]);
  });

  it("X2: a missing collection or a non-string id answers not found", async () => {
    expect(await deleteCollection("gone")).toEqual(COLLECTION_NOT_FOUND_RESULT);
    expect(await deleteCollection(null as unknown as string)).toEqual(COLLECTION_NOT_FOUND_RESULT);
    expect(db.collections).toHaveLength(2);
  });

  it("X3: a database error answers with a retry message", async () => {
    db.down = true;

    expect(await deleteCollection("c-react")).toEqual({ success: false, error: { message: SOMETHING_WENT_WRONG } });
  });

  it("X4: a signed-out caller is redirected to sign in and nothing is deleted", async () => {
    vi.mocked(requireCurrentUserId).mockImplementation(() => redirect("/sign-in"));

    await expect(deleteCollection("c-react")).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_REDIRECT"),
    });
    expect(db.collections).toHaveLength(2);
  });
});

describe("setCollectionFavorite action (CF6–CF10)", () => {
  const collection = () => db.collections.find((row) => row.id === "c-react")!;

  beforeEach(() => {
    db.collections.push(
      { id: "c-react", userId: "ada", name: "React", slug: "react", description: null, isFavorite: false, updatedAt },
      { id: "c-bob", userId: "bob", name: "Bob's", slug: "bobs", description: null, isFavorite: false, updatedAt },
    );
  });

  it("CF6: saves the value sent, keeps the name and slug, moves the update time, and refreshes the session", async () => {
    expect(await setCollectionFavorite("c-react", true)).toEqual({ success: true, data: null });
    expect(collection()).toMatchObject({ isFavorite: true, name: "React", slug: "react" });
    expect(collection().updatedAt).not.toEqual(updatedAt);
    expect(resetProfile).toHaveBeenCalledOnce();

    expect(await setCollectionFavorite("c-react", false)).toEqual({ success: true, data: null });
    expect(collection().isFavorite).toBe(false);
  });

  it("CF6: sending the same value twice leaves it set, never flipped back", async () => {
    await setCollectionFavorite("c-react", true);
    await setCollectionFavorite("c-react", true);

    expect(collection().isFavorite).toBe(true);
  });

  it("CF7: a value that isn't a boolean is invalid and writes nothing", async () => {
    db.down = true;

    expect(await setCollectionFavorite("c-react", 1 as unknown as boolean)).toEqual({
      success: false,
      error: { message: FIELDS_INVALID },
    });
    expect(resetProfile).not.toHaveBeenCalled();
  });

  it("CF8: another user's collection answers not found, is left unchanged, and refreshes stale lists", async () => {
    expect(await setCollectionFavorite("c-bob", true)).toEqual(COLLECTION_NOT_FOUND_RESULT);
    expect(db.collections.find((row) => row.id === "c-bob")?.isFavorite).toBe(false);
    expect(resetProfile).toHaveBeenCalledOnce();
  });

  it("CF8: a missing collection, or an id that isn't a string, answers not found", async () => {
    expect(await setCollectionFavorite("gone", true)).toEqual(COLLECTION_NOT_FOUND_RESULT);
    db.down = true;
    expect(await setCollectionFavorite(null as unknown as string, true)).toEqual(COLLECTION_NOT_FOUND_RESULT);
  });

  it("CF9: a database error answers with a retry message", async () => {
    db.down = true;

    expect(await setCollectionFavorite("c-react", true)).toEqual({ success: false, error: { message: SOMETHING_WENT_WRONG } });
    expect(resetProfile).not.toHaveBeenCalled();
  });

  it("CF10: a signed-out caller is redirected to sign in, even with an invalid value, and nothing is written", async () => {
    vi.mocked(requireCurrentUserId).mockImplementation(() => redirect("/sign-in"));

    await expect(setCollectionFavorite("c-react", "yes" as unknown as boolean)).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_REDIRECT"),
    });
    expect(collection().isFavorite).toBe(false);
  });
});

describe("createCollection action: Free plan limit (Billing 2: R2, R4; Billing 3: plan-limit code)", () => {
  const fill = () => {
    for (let n = 0; n < PRICING.free.collectionLimit; n++) {
      db.collections.push({ id: `c${n}`, userId: "ada", name: `C ${n}`, slug: `c-${n}`, updatedAt });
    }
  };

  it("R2: a Free user at the limit is refused with the limit message; nothing is saved", async () => {
    fill();

    expect(await createCollection({ name: "One too many", description: "", isFavorite: false })).toEqual({
      success: false,
      error: { message: COLLECTION_LIMIT_REACHED, code: "plan-limit" },
    });
    expect(db.collections).toHaveLength(PRICING.free.collectionLimit);
    expect(resetProfile).not.toHaveBeenCalled();
  });

  it("R4: a Pro user creates past the Free limit", async () => {
    signInOnPlan("PRO");
    fill();

    expect(await createCollection({ name: "Unlimited", description: "", isFavorite: false })).toMatchObject({ success: true });
    expect(db.collections).toHaveLength(PRICING.free.collectionLimit + 1);
  });
});
