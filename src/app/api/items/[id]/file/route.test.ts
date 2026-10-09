import { beforeEach, describe, expect, it, vi } from "vitest";

import { getItemFile } from "@/lib/db/items";
import { requireCurrentUserId } from "@/services/auth/session";
import { resetStorage, storage, upload } from "@/test/fake-storage";

import { GET } from "./route";

vi.mock("@/lib/db/items", () => ({ getItemFile: vi.fn() }));
vi.mock("@/services/auth/session", () => ({ requireCurrentUserId: vi.fn() }));
vi.mock("@/services/storage", async () => (await import("@/test/fake-storage")).fakeStorage);

const request = (id: string, query = "", headers: HeadersInit = {}) =>
  GET(new Request(`https://app.test/api/items/${id}/file${query}`, { headers }), { params: Promise.resolve({ id }) });

const IMAGE = { typeName: "image", fileKey: "users/ada/u1.svg", fileName: "logo.svg", mimeType: "image/svg+xml", fileSize: 11 };
const PDF = { typeName: "file", fileKey: "users/ada/u2.pdf", fileName: "Spec v1.pdf", mimeType: "application/pdf", fileSize: 9 };
// A file item that happens to hold a picture: the item type decides caching, not the stored type.
const PNG_FILE = { typeName: "file", fileKey: "users/ada/u3.png", fileName: "shot.png", mimeType: "image/png", fileSize: 4 };

beforeEach(() => {
  resetStorage();
  vi.mocked(requireCurrentUserId).mockResolvedValue("ada");
  vi.mocked(getItemFile).mockReset().mockImplementation(async (id) => ({ img: IMAGE, pdf: PDF, png: PNG_FILE })[id] ?? null);
  upload(IMAGE.fileKey, "<svg></svg>");
  upload(PDF.fileKey, "%PDF-1.7");
  upload(PNG_FILE.fileKey, "PNG!");
});

describe("GET /api/items/[id]/file: serving the file (F9)", () => {
  it("streams the stored file with its stored type and size", async () => {
    const response = await request("pdf");

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("%PDF-1.7");
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-length")).toBe("8");
    expect(getItemFile).toHaveBeenCalledWith("pdf");
  });

  it("shows an image inline by default, under its name", async () => {
    const response = await request("img");

    expect(response.headers.get("content-disposition")).toBe(
      "inline; filename=\"logo.svg\"; filename*=UTF-8''logo.svg",
    );
  });

  it("serves an image as a download with ?download=1", async () => {
    const response = await request("img", "?download=1");

    expect(response.headers.get("content-disposition")).toMatch(/^attachment; /);
  });

  it("always serves a non-image file as a download", async () => {
    const response = await request("pdf");

    expect(response.headers.get("content-disposition")).toBe(
      "attachment; filename=\"Spec v1.pdf\"; filename*=UTF-8''Spec%20v1.pdf",
    );
  });
});

describe("GET /api/items/[id]/file: security headers (F9)", () => {
  it("sandboxes every file and stops type sniffing, so an SVG can't run script on the app", async () => {
    for (const response of [await request("img"), await request("img", "?download=1"), await request("pdf")]) {
      const csp = response.headers.get("content-security-policy") ?? "";
      expect(csp).toMatch(/(^|;\s*)sandbox(;|$)/);
      expect(csp).toContain("default-src 'none'");
      expect(csp).not.toMatch(/script-src/);
      expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    }
  });

  it("never lets a shared cache keep an image: private even though the browser may", async () => {
    expect((await request("img")).headers.get("cache-control")).toMatch(/^private,/);
  });
});

describe("GET /api/items/[id]/file: not found (F9)", () => {
  it("answers 404 when the item is missing, another user's, or has no file", async () => {
    const response = await request("bobs");

    expect(response.status).toBe(404);
    expect(JSON.stringify(await response.json())).not.toContain("bobs");
  });

  it("answers 404 when the stored file is gone", async () => {
    storage.objects.delete(PDF.fileKey);

    expect((await request("pdf")).status).toBe(404);
  });

  it("reads storage as the session user: a key in another folder is not served", async () => {
    vi.mocked(getItemFile).mockResolvedValue({ ...PDF, fileKey: "users/bob/u9.pdf" });
    upload("users/bob/u9.pdf", "bob's");

    expect((await request("pdf")).status).toBe(404);
  });

  it("the 404 carries the security headers too", async () => {
    const response = await request("bobs");

    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });
});

/** The ETag the route gave an image on its first load. */
const etagOf = async (id: string) => (await request(id)).headers.get("etag") ?? "";

describe("GET /api/items/[id]/file: image revalidation", () => {
  it("R2: an image is kept by the browser but rechecked each time (private, no-cache)", async () => {
    expect((await request("img")).headers.get("cache-control")).toBe("private, no-cache");
  });

  it("R3: an image carries a quoted ETag that stays the same across loads", async () => {
    const etag = await etagOf("img");

    expect(etag).toMatch(/^"[^"]+"$/);
    expect(await etagOf("img")).toBe(etag);
  });

  it("R3: the ETag never exposes the storage key", async () => {
    const etag = await etagOf("img");

    expect(etag).not.toContain("u1");
    expect(etag).not.toContain("users");
    expect(etag).not.toContain("ada");
  });

  it("R3: a new upload (new key) gets a new ETag", async () => {
    const before = await etagOf("img");
    vi.mocked(getItemFile).mockResolvedValue({ ...IMAGE, fileKey: "users/ada/u9.svg" });
    upload("users/ada/u9.svg", "<svg/>");

    expect(await etagOf("img")).not.toBe(before);
  });

  it("R4: a matching If-None-Match answers 304 without reading storage", async () => {
    const etag = await etagOf("img");
    // Gone from storage: only a route that skipped the read can still answer 304.
    storage.objects.delete(IMAGE.fileKey);

    const response = await request("img", "", { "if-none-match": etag });

    expect(response.status).toBe(304);
  });

  it("R4: a stale If-None-Match gets the full image", async () => {
    const response = await request("img", "", { "if-none-match": "\"stale\"" });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("<svg></svg>");
  });

  it("R5: a 304 has no body and repeats the ETag, cache and security headers", async () => {
    const etag = await etagOf("img");

    const response = await request("img", "", { "if-none-match": etag });

    expect(await response.text()).toBe("");
    expect(response.headers.get("etag")).toBe(etag);
    expect(response.headers.get("cache-control")).toBe("private, no-cache");
    expect(response.headers.get("content-security-policy")).toMatch(/(^|;s*)sandbox(;|$)/);
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("R6: another user's or a missing item answers 404 even with a matching ETag", async () => {
    const etag = await etagOf("img");

    for (const id of ["bobs", "missing"]) {
      expect((await request(id, "", { "if-none-match": etag })).status).toBe(404);
      expect((await request(id, "", { "if-none-match": "*" })).status).toBe(404);
    }
  });

  it("R7: matches an ETag inside a list", async () => {
    const etag = await etagOf("img");

    expect((await request("img", "", { "if-none-match": `"a", ${etag} , "b"` })).status).toBe(304);
  });

  it("R7: matches the weak form of the ETag", async () => {
    const etag = await etagOf("img");

    expect((await request("img", "", { "if-none-match": `W/${etag}` })).status).toBe(304);
  });

  it("R7: * matches any stored image", async () => {
    expect((await request("img", "", { "if-none-match": "*" })).status).toBe(304);
  });

  it("R8: the download and the inline image share one ETag", async () => {
    const inline = await etagOf("img");
    const download = (await request("img", "?download=1")).headers.get("etag");

    expect(download).toBe(inline);
    expect((await request("img", "?download=1", { "if-none-match": inline })).status).toBe(304);
  });
});

describe("GET /api/items/[id]/file: file items are never kept", () => {
  it("R9: a file item stays private, no-store with no ETag", async () => {
    for (const id of ["pdf", "png"]) {
      const response = await request(id);
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      expect(response.headers.get("etag")).toBeNull();
    }
  });

  it("R9: a file item ignores If-None-Match and always streams from storage", async () => {
    const imageEtag = await etagOf("img");

    for (const ifNoneMatch of ["*", imageEtag]) {
      const response = await request("pdf", "", { "if-none-match": ifNoneMatch });
      expect(response.status).toBe(200);
      expect(await response.text()).toBe("%PDF-1.7");
    }
  });

  it("R1: the item type decides, not the stored type: a picture in a file item is not kept", async () => {
    const response = await request("png", "", { "if-none-match": "*" });

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
});
