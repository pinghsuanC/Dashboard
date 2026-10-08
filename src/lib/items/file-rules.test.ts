import { describe, expect, it } from "vitest";

import { BYTES_PER_MB, UPLOAD_RULES } from "@/lib/constants/files";
import { fileTooLarge, fileTypeNotAllowed } from "@/lib/constants/messages/items";

import { checkFile } from "./file-rules";

const MAX = 5 * BYTES_PER_MB;

describe("upload rules: size (F5)", () => {
  it("both kinds take up to 5 MB, exactly 5 MB included", () => {
    expect(checkFile("image", { name: "a.png", size: MAX, mimeType: "image/png" }).ok).toBe(true);
    expect(checkFile("file", { name: "a.pdf", size: MAX, mimeType: "application/pdf" }).ok).toBe(true);
  });

  it("refuses one byte over, with the limit in the message", () => {
    expect(checkFile("image", { name: "a.png", size: MAX + 1, mimeType: "image/png" })).toEqual({
      ok: false,
      error: fileTooLarge(MAX),
    });
    expect(checkFile("file", { name: "a.pdf", size: MAX + 1, mimeType: "application/pdf" })).toEqual({
      ok: false,
      error: fileTooLarge(MAX),
    });
    expect(fileTooLarge(MAX)).toContain("5 MB");
  });

  it("accepts an empty file", () => {
    expect(checkFile("file", { name: "a.txt", size: 0, mimeType: "text/plain" })).toEqual({
      ok: true,
      file: { name: "a.txt", size: 0, ext: ".txt", contentType: "text/plain" },
    });
  });

  it("refuses a size that isn't a whole, finite number", () => {
    for (const size of [1.5, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(checkFile("file", { name: "a.txt", size, mimeType: "text/plain" }).ok).toBe(false);
    }
  });
});

describe("upload rules: type (F5)", () => {
  const imageTypes = fileTypeNotAllowed(Object.keys(UPLOAD_RULES.image.types));

  it("accepts every listed extension of each kind with its MIME type", () => {
    for (const kind of ["image", "file"] as const) {
      for (const [ext, mimes] of Object.entries(UPLOAD_RULES[kind].types)) {
        for (const mimeType of mimes) {
          expect(checkFile(kind, { name: `x${ext}`, size: 10, mimeType }).ok, `${kind} ${ext} ${mimeType}`).toBe(true);
        }
      }
    }
  });

  it("refuses an extension the kind doesn't list, naming the allowed ones", () => {
    expect(checkFile("image", { name: "a.pdf", size: 10, mimeType: "application/pdf" })).toEqual({
      ok: false,
      error: imageTypes,
    });
    expect(checkFile("file", { name: "a.png", size: 10, mimeType: "image/png" }).ok).toBe(false);
    expect(checkFile("file", { name: "a.exe", size: 10, mimeType: "" }).ok).toBe(false);
    expect(checkFile("file", { name: "README", size: 10, mimeType: "text/plain" }).ok).toBe(false);
  });

  it("only the last extension counts: a.png.exe is refused", () => {
    expect(checkFile("image", { name: "a.png.exe", size: 10, mimeType: "image/png" }).ok).toBe(false);
  });

  it("refuses a reported MIME type that contradicts the extension", () => {
    expect(checkFile("image", { name: "a.png", size: 10, mimeType: "text/html" })).toEqual({
      ok: false,
      error: imageTypes,
    });
    expect(checkFile("image", { name: "a.svg", size: 10, mimeType: "image/png" }).ok).toBe(false);
  });

  it("accepts a blank MIME type, which browsers report for types they don't know", () => {
    expect(checkFile("file", { name: "config.toml", size: 10, mimeType: "" }).ok).toBe(true);
  });

  it("matches extensions and MIME types whatever their case", () => {
    expect(checkFile("image", { name: "A.PNG", size: 10, mimeType: "IMAGE/PNG" }).ok).toBe(true);
  });
});

describe("upload rules: the file as stored (F5)", () => {
  it("returns the cleaned name, size, extension and the extension's own MIME type", () => {
    expect(checkFile("file", { name: "../notes v1.YML", size: 42, mimeType: "text/yaml" })).toEqual({
      ok: true,
      file: { name: "notes v1.yml", size: 42, ext: ".yml", contentType: "application/x-yaml" },
    });
  });

  it("stores a blank-typed file as its extension's type, never as what the browser said", () => {
    expect(checkFile("file", { name: "a.md", size: 1, mimeType: "" })).toMatchObject({
      file: { contentType: "text/markdown" },
    });
  });
});
