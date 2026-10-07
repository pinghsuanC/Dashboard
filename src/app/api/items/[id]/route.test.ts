import { beforeEach, describe, expect, it, vi } from "vitest";

import { getItemDetail, type ItemDetail } from "@/lib/db/items";

import { GET } from "./route";

vi.mock("@/lib/db/items", () => ({ getItemDetail: vi.fn() }));

const request = (id: string) =>
  GET(new Request(`https://app.test/api/items/${id}`), { params: Promise.resolve({ id }) });

const detail: ItemDetail = {
  id: "hook",
  title: "useAuth Hook",
  description: null,
  content: "export function useAuth() {}",
  language: "typescript",
  url: null,
  fileName: null,
  fileSize: null,
  mimeType: null,
  isPinned: false,
  isFavorite: true,
  createdAt: new Date(Date.UTC(2026, 0, 1)),
  updatedAt: new Date(Date.UTC(2026, 0, 2)),
  tags: ["react"],
  type: { id: "t-snippet", name: "snippet", label: "Snippet", icon: "Code", color: "#3b82f6" },
  collections: [{ id: "c-react", name: "React Patterns" }],
};

beforeEach(() => {
  vi.mocked(getItemDetail).mockReset();
});

describe("GET /api/items/[id] (the item drawer's fetch)", () => {
  it("R4: answers 200 with the item, dates as ISO strings", async () => {
    vi.mocked(getItemDetail).mockResolvedValue(detail);

    const response = await request("hook");

    expect(response.status).toBe(200);
    expect(getItemDetail).toHaveBeenCalledWith("hook");
    expect(await response.json()).toEqual({
      ...detail,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    });
  });

  it("R5: answers 404 with no item when the loader finds none (missing, or not the user's)", async () => {
    vi.mocked(getItemDetail).mockResolvedValue(null);

    const response = await request("bobs");

    expect(response.status).toBe(404);
    expect(JSON.stringify(await response.json())).not.toContain("bobs");
  });
});
