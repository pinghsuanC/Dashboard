import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchItemDetail } from "./fetch-item-detail";

const fetchMock = vi.fn<typeof fetch>();

const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), { headers: { "content-type": "application/json" }, ...init });

// `Response.redirected` and `.url` are read-only and only set by a real fetch.
const redirectedTo = (url: string) => {
  const response = new Response("<html>sign in</html>", { status: 200 });
  Object.defineProperty(response, "redirected", { value: true });
  Object.defineProperty(response, "url", { value: url });
  return response;
};

const body = {
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
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
  tags: ["react"],
  type: { id: "t-snippet", name: "snippet", label: "Snippet", icon: "Code", color: "#3b82f6" },
  collections: [{ id: "c-react", name: "React Patterns" }],
};

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchItemDetail (the item drawer's request)", () => {
  it("R6: returns the item with its dates back as Date objects", async () => {
    fetchMock.mockResolvedValue(json(body));

    const result = await fetchItemDetail("hook");

    expect(result).toEqual({
      status: "ok",
      item: {
        ...body,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      },
    });
  });

  it("R10: asks the item route for that id, encoded", async () => {
    fetchMock.mockResolvedValue(json(body));

    await fetchItemDetail("a/b?c");

    expect(fetchMock).toHaveBeenCalledWith("/api/items/a%2Fb%3Fc", expect.anything());
  });

  it("R7: reports not-found on a 404 (missing, or not the user's)", async () => {
    fetchMock.mockResolvedValue(json({ error: "Not found" }, { status: 404 }));

    expect(await fetchItemDetail("bobs")).toEqual({ status: "not-found" });
  });

  it("R8: reports signed-out with the sign-in URL when the route redirected", async () => {
    fetchMock.mockResolvedValue(redirectedTo("https://app.test/sign-in"));

    expect(await fetchItemDetail("hook")).toEqual({
      status: "signed-out",
      url: "https://app.test/sign-in",
    });
  });

  it("R9: reports an error on a server failure", async () => {
    fetchMock.mockResolvedValue(json({ error: "boom" }, { status: 500 }));

    expect(await fetchItemDetail("hook")).toEqual({ status: "error" });
  });

  it("R9: reports an error when the network fails", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    expect(await fetchItemDetail("hook")).toEqual({ status: "error" });
  });
});
