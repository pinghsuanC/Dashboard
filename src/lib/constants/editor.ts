import type { EditorPreferences, EditorTheme } from "@/types/editor";

/**
 * The settings page's editor choices. Each list is the whole set the action
 * accepts and the stored value is read against, so removing an option here
 * turns a saved choice of it back into the default.
 */
export const EDITOR_FONT_SIZES = [12, 13, 14, 16, 18, 20] as const;
export const EDITOR_TAB_SIZES = [2, 4, 8] as const;
export const EDITOR_THEMES: readonly { value: EditorTheme; label: string }[] = [
  { value: "vs-dark", label: "VS Dark" },
  { value: "monokai", label: "Monokai" },
  { value: "github-dark", label: "GitHub Dark" },
];

/** A new user's editor, and any stored field that is missing or no longer offered. */
export const DEFAULT_EDITOR_PREFERENCES: EditorPreferences = {
  fontSize: 12,
  tabSize: 2,
  wordWrap: true,
  minimap: false,
  theme: "vs-dark",
};

/** Lines are this many times the font size tall. */
export const EDITOR_LINE_HEIGHT_RATIO = 1.5;
