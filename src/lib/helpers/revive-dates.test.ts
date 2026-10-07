import { describe, expect, it } from "vitest";

import type { Jsonified } from "@/types/json";

import { reviveDates } from "./revive-dates";

interface Note {
  id: string;
  title: string;
  createdAt: Date;
  archivedAt: Date | null;
}

const json: Jsonified<Note> = {
  id: "n1",
  // Looks like a date, but is a title: it must stay a string.
  title: "2026-03-03T03:03:03.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  archivedAt: "2026-02-02T12:30:00.000Z",
};

describe("reviveDates (dates from a JSON body)", () => {
  it("R1: turns each listed field's ISO string back into the same Date", () => {
    const note = reviveDates<Note>(json, { createdAt: true, archivedAt: true });

    expect(note.createdAt).toBeInstanceOf(Date);
    expect(note.createdAt.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(note.archivedAt).toEqual(new Date("2026-02-02T12:30:00.000Z"));
  });

  it("R2: leaves fields it wasn't given, even a date-looking string", () => {
    const note = reviveDates<Note>(json, { createdAt: true, archivedAt: true });

    expect(note).toMatchObject({ id: "n1", title: "2026-03-03T03:03:03.000Z" });
  });

  it("R3: a null date stays null", () => {
    const note = reviveDates<Note>({ ...json, archivedAt: null }, { createdAt: true, archivedAt: true });

    expect(note).toMatchObject({ archivedAt: null, createdAt: new Date("2026-01-01T00:00:00.000Z") });
  });

  it("R4: the field list must name every Date field and nothing else (checked by tsc)", () => {
    // @ts-expect-error `archivedAt` is a Date field and is missing.
    reviveDates<Note>(json, { createdAt: true });
    // @ts-expect-error `title` is not a Date field.
    reviveDates<Note>(json, { createdAt: true, archivedAt: true, title: true });
    // @ts-expect-error the body's dates are strings, not Dates.
    reviveDates<Note>({ ...json, createdAt: new Date() }, { createdAt: true, archivedAt: true });
  });
});
