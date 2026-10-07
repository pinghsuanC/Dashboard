import { beforeEach, describe, expect, it, vi } from "vitest";

import { db, resetDb } from "@/test/fake-prisma";

import { getSystemItemTypeByName } from "./item-types";

vi.mock("@/services/prisma", async () => ({ prisma: (await import("@/test/fake-prisma")).fakePrisma }));

beforeEach(() => {
  resetDb();
  db.itemTypes.push({ id: "t-snippet", name: "snippet", label: "Snippets", icon: "Code", color: "#3b82f6", isSystem: true, userId: null });
});

describe("resolving the type an /items/[type] page lists", () => {
  it("finds a built-in type by name, with its route", async () => {
    expect(await getSystemItemTypeByName("snippet")).toEqual({
      id: "t-snippet",
      name: "snippet",
      label: "Snippets",
      icon: "Code",
      color: "#3b82f6",
      route: "/items/snippets",
    });
  });

  it("finds nothing for an unknown name", async () => {
    expect(await getSystemItemTypeByName("recipe")).toBeNull();
  });

  it("never resolves to a type another user owns", async () => {
    db.itemTypes.push({ id: "t-bobs", name: "recipe", label: "Recipes", color: "#000000", isSystem: true, userId: "bob" });

    expect(await getSystemItemTypeByName("recipe")).toBeNull();
  });
});
