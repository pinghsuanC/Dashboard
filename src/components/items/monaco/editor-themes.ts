import type { BeforeMount } from "@monaco-editor/react";

import type { EditorTheme } from "@/types/editor";

/** Monaco's id for each theme the settings page offers. */
export const MONACO_THEME_IDS: Record<EditorTheme, string> = {
  "vs-dark": "stashboard-dark",
  monokai: "stashboard-monokai",
  "github-dark": "stashboard-github-dark",
};

// Gutter, scrollbars and widgets shared by every theme: flat, no shadows.
const chrome = (background: string, lineNumber: string, activeLineNumber: string) => ({
  "editor.background": background,
  "editorGutter.background": background,
  "editorWidget.background": background,
  "editorWidget.border": "#ffffff1a",
  "editor.lineHighlightBackground": "#ffffff08",
  "editor.lineHighlightBorder": "#00000000",
  "editorLineNumber.foreground": lineNumber,
  "editorLineNumber.activeForeground": activeLineNumber,
  "minimap.background": background,
  "scrollbar.shadow": "#00000000",
  "scrollbarSlider.background": "#ffffff1a",
  "scrollbarSlider.hoverBackground": "#ffffff33",
  "scrollbarSlider.activeBackground": "#ffffff4d",
});

/**
 * Defines every theme, so switching between them needs no remount. Monaco
 * takes hex, not CSS variables. VS Dark is Monaco's own `vs-dark` with the
 * background matched to the app's card (the `.dark` tokens in globals.css);
 * Monokai and GitHub Dark bring their own backgrounds and token colours.
 * Rules match token prefixes, so `keyword` also colours `keyword.js`.
 */
export const defineEditorThemes: BeforeMount = (monaco) => {
  monaco.editor.defineTheme(MONACO_THEME_IDS["vs-dark"], {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: chrome("#171717", "#525252", "#a3a3a3"),
  });

  monaco.editor.defineTheme(MONACO_THEME_IDS.monokai, {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "", foreground: "f8f8f2" },
      { token: "comment", foreground: "75715e", fontStyle: "italic" },
      { token: "string", foreground: "e6db74" },
      { token: "number", foreground: "ae81ff" },
      { token: "constant", foreground: "ae81ff" },
      { token: "regexp", foreground: "e6db74" },
      { token: "keyword", foreground: "f92672" },
      { token: "operator", foreground: "f92672" },
      { token: "type", foreground: "66d9ef", fontStyle: "italic" },
      { token: "tag", foreground: "f92672" },
      { token: "attribute.name", foreground: "a6e22e" },
      { token: "attribute.value", foreground: "e6db74" },
      { token: "variable", foreground: "fd971f" },
      { token: "delimiter", foreground: "f8f8f2" },
    ],
    colors: {
      ...chrome("#272822", "#90908a", "#f8f8f2"),
      "editor.foreground": "#f8f8f2",
      "editor.selectionBackground": "#49483e",
      "editorCursor.foreground": "#f8f8f0",
    },
  });

  monaco.editor.defineTheme(MONACO_THEME_IDS["github-dark"], {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "", foreground: "e6edf3" },
      { token: "comment", foreground: "8b949e", fontStyle: "italic" },
      { token: "string", foreground: "a5d6ff" },
      { token: "number", foreground: "79c0ff" },
      { token: "constant", foreground: "79c0ff" },
      { token: "regexp", foreground: "7ee787" },
      { token: "keyword", foreground: "ff7b72" },
      { token: "operator", foreground: "ff7b72" },
      { token: "type", foreground: "ffa657" },
      { token: "tag", foreground: "7ee787" },
      { token: "attribute.name", foreground: "79c0ff" },
      { token: "attribute.value", foreground: "a5d6ff" },
      { token: "variable", foreground: "ffa657" },
      { token: "delimiter", foreground: "e6edf3" },
    ],
    colors: {
      ...chrome("#0d1117", "#6e7681", "#e6edf3"),
      "editor.foreground": "#e6edf3",
      "editor.selectionBackground": "#264f78",
      "editorCursor.foreground": "#e6edf3",
    },
  });
};
