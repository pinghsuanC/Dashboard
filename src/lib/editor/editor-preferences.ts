import { z } from "zod";

import {
  DEFAULT_EDITOR_PREFERENCES,
  EDITOR_FONT_SIZES,
  EDITOR_TAB_SIZES,
  EDITOR_THEMES,
} from "@/lib/constants/editor";
import type { EditorPreferences, EditorTheme } from "@/types/editor";

const oneOf = <T extends number>(options: readonly T[]) =>
  z.number().refine((value): value is T => (options as readonly number[]).includes(value));

const fields = {
  fontSize: oneOf(EDITOR_FONT_SIZES),
  tabSize: oneOf(EDITOR_TAB_SIZES),
  wordWrap: z.boolean(),
  minimap: z.boolean(),
  theme: z.enum(EDITOR_THEMES.map((theme) => theme.value) as [EditorTheme, ...EditorTheme[]]),
};

/**
 * A save from the settings page: every field, each one of the offered
 * options. Unknown keys are stripped, so nothing else reaches the user row.
 */
export const editorPreferencesSchema: z.ZodType<EditorPreferences> = z.object(fields);

/**
 * The stored JSON as preferences. Postgres doesn't check the column's shape,
 * so each field is read on its own: one that is missing, the wrong type, or an
 * option no longer offered becomes its default, and the rest are kept.
 */
export const parseEditorPreferences = (stored: unknown): EditorPreferences => {
  const source =
    stored !== null && typeof stored === "object" && !Array.isArray(stored)
      ? (stored as Record<string, unknown>)
      : {};

  const read = <K extends keyof EditorPreferences>(key: K): EditorPreferences[K] => {
    const parsed = fields[key].safeParse(source[key]);
    return parsed.success ? (parsed.data as EditorPreferences[K]) : DEFAULT_EDITOR_PREFERENCES[key];
  };

  return {
    fontSize: read("fontSize"),
    tabSize: read("tabSize"),
    wordWrap: read("wordWrap"),
    minimap: read("minimap"),
    theme: read("theme"),
  };
};
