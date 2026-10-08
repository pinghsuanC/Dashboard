import { beforeEach, describe, expect, it, vi } from "vitest";

import { getItemFile } from "@/lib/db/items";
import { requireCurrentUserId } from "@/services/auth/session";
import { resetStorage, storage, upload } from "@/test/fake-storage";

import { GET } from "./route";

vi.mock("@/lib/db/items", () => ({ getItemFile: vi.fn() }));
vi.mock("@/services/auth/session", () => ({ requireCurrentUserId: vi.fn() }));
vi.mock("@/services/storage", async () => (await import("@/test/fake-storage")).fakeStorage);

const request = (id: string, query = "") =>
  GET(new Request(`https://app.test/api/items/${id}/file${query}`), { params: Promise.resolve({ id }) });

const IMAGE = { fileKey: "users/ada/u1.svg", fileName: "logo.svg", mimeType: "image/svg+xml", fileSize: 11 };
const PDF = { fileKey: "users/ada/u2.pdf", fileName: "Spec v1.pdf", mimeType: "application/pdf", fileSize: 9 };

beforeEach(() => {
  resetStorage();
  vi.mocked(requireCurrentUserId).mockResolvedValue("ada");
  vi.mocked(getItemFile).mockReset().mockImplementation(async (id) => ({ img: IMAGE, pdf: PDF })[id] ?? null);
  upload(IMAGE.fileKey, "<svg></svg>");
  upload(PDF.fileKey, "%PDF-1.7");
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

  it("is never cached where another user of the browser could get it", async () => {
    expect((await request("img")).headers.get("cache-control")).toBe("private, no-store");
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
