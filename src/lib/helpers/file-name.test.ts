import { describe, expect, it } from "vitest";

import { FILE_NAME_MAX_LENGTH } from "@/lib/constants/files";

import { contentDisposition, fileExtension, sanitizeFileName } from "./file-name";

describe("file extension, what the upload rules check (F2)", () => {
  it("is the last extension, lower-cased, with its dot", () => {
    expect(fileExtension("Photo.PNG")).toBe(".png");
    expect(fileExtension("archive.tar.gz")).toBe(".gz");
    expect(fileExtension("a.png.exe")).toBe(".exe");
  });

  it("is empty when there is none", () => {
    expect(fileExtension("README")).toBe("");
    expect(fileExtension("trailing.")).toBe("");
  });

  it("a leading dot alone is a hidden name, not an extension", () => {
    expect(fileExtension(".env")).toBe("");
  });

  it("ignores dots in folder parts", () => {
    expect(fileExtension("my.folder/notes")).toBe("");
    expect(fileExtension("C:\\my.folder\\notes")).toBe("");
  });
});

describe("file name sanitising, before the name is stored (F3)", () => {
  it("keeps an ordinary name as it is", () => {
    expect(sanitizeFileName("Quarterly report_v2-final.pdf")).toBe("Quarterly report_v2-final.pdf");
  });

  it("drops folder parts, so a name can't point at another path", () => {
    expect(sanitizeFileName("../../etc/passwd.txt")).toBe("passwd.txt");
    expect(sanitizeFileName("..\\..\\boot.ini")).toBe("boot.ini");
  });

  it("removes special and control characters", () => {
    expect(sanitizeFileName('my<file>?:*|".md')).toBe("myfile.md");
    expect(sanitizeFileName("tab\there\u0000null\nline.txt")).toBe("tabherenullline.txt");
  });

  it("keeps letters of any script", () => {
    expect(sanitizeFileName("筆記.md")).toBe("筆記.md");
    expect(sanitizeFileName("Café résumé.pdf")).toBe("Café résumé.pdf");
  });

  it("collapses runs of spaces, dots and dashes", () => {
    expect(sanitizeFileName("a...b  --c.txt")).toBe("a.b -c.txt");
  });

  it("trims leading and trailing dots and spaces", () => {
    expect(sanitizeFileName("  .hidden .txt")).toBe("hidden.txt");
  });

  it("lower-cases the extension", () => {
    expect(sanitizeFileName("Photo.PNG")).toBe("Photo.png");
  });

  it("caps a long base name and keeps the extension", () => {
    const cleaned = sanitizeFileName(`${"a".repeat(300)}.json`);

    expect(cleaned).toBe(`${"a".repeat(FILE_NAME_MAX_LENGTH)}.json`);
  });

  it("counts characters, not UTF-16 units, so a letter outside the BMP isn't cut in half", () => {
    // U+20000, a CJK letter stored as two UTF-16 units.
    const letter = "\u{20000}";
    const cleaned = sanitizeFileName(`${letter.repeat(150)}.md`);

    expect(cleaned).toBe(`${letter.repeat(FILE_NAME_MAX_LENGTH)}.md`);
  });

  it("falls back to 'file' when nothing of the name is left", () => {
    expect(sanitizeFileName("???.png")).toBe("file.png");
    expect(sanitizeFileName("../***.png")).toBe("file.png");
    expect(sanitizeFileName("")).toBe("file");
  });

  it("keeps only the last extension; the upload rules decide whether it is allowed", () => {
    expect(sanitizeFileName("a.png.exe")).toBe("a.png.exe");
  });
});

describe("Content-Disposition for served files (F4)", () => {
  it("sends an ASCII name as both filename and filename*", () => {
    expect(contentDisposition("attachment", "report.pdf")).toBe(
      "attachment; filename=\"report.pdf\"; filename*=UTF-8''report.pdf",
    );
  });

  it("gives non-ASCII names an ASCII fallback and the exact name encoded", () => {
    expect(contentDisposition("inline", "筆記.md")).toBe("inline; filename=\"__.md\"; filename*=UTF-8''%E7%AD%86%E8%A8%98.md");
  });

  it("escapes characters that would break the header", () => {
    const header = contentDisposition("attachment", "a \"quoted\" (1)'s.txt");

    expect(header).toBe(
      "attachment; filename=\"a _quoted_ (1)'s.txt\"; filename*=UTF-8''a%20%22quoted%22%20%281%29%27s.txt",
    );
  });
});
