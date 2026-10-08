import { describe, expect, it } from "vitest";

import { UPLOAD_RULES } from "@/lib/constants/files";

import { fileIconKind } from "./file-icons";

describe("file row icon, chosen by extension (FL3)", () => {
  it("a PDF gets the PDF icon", () => {
    expect(fileIconKind("report.pdf")).toBe("pdf");
  });

  it("plain text and Markdown get the text icon", () => {
    expect(fileIconKind("notes.txt")).toBe("text");
    expect(fileIconKind("README.md")).toBe("text");
  });

  it("structured config and data files get the code icon", () => {
    for (const name of ["data.json", "ci.yaml", "ci.yml", "feed.xml", "Cargo.toml", "setup.ini"]) {
      expect(fileIconKind(name)).toBe("code");
    }
  });

  it("a CSV gets the spreadsheet icon", () => {
    expect(fileIconKind("export.csv")).toBe("spreadsheet");
  });

  it("matches the extension whatever its case", () => {
    expect(fileIconKind("SCAN.PDF")).toBe("pdf");
    expect(fileIconKind("Data.Json")).toBe("code");
  });

  it("goes by the last extension only", () => {
    expect(fileIconKind("backup.pdf.txt")).toBe("text");
  });

  it("every extension a file item may upload has its own icon, not the generic one", () => {
    for (const ext of Object.keys(UPLOAD_RULES.file.types)) {
      expect(fileIconKind(`upload${ext}`), ext).not.toBe("file");
    }
  });

  it("an unknown extension, no extension, a hidden name or no name gets the generic icon", () => {
    for (const name of ["archive.zip", "Makefile", ".env", "trailing.", "", null]) {
      expect(fileIconKind(name)).toBe("file");
    }
  });
});
