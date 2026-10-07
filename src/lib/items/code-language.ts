import { CODE_LANGUAGE_FALLBACK_LABEL } from "@/lib/constants/ui";

/** Monaco's id for text with no highlighting. */
const PLAIN_TEXT = "plaintext";

/**
 * Monaco language ids an item's language can name directly. A subset of
 * Monaco's built-in languages: the ones a developer's snippets plausibly use.
 */
const MONACO_LANGUAGES: ReadonlySet<string> = new Set([
  "c",
  "cpp",
  "csharp",
  "css",
  "dockerfile",
  "go",
  "graphql",
  "html",
  "ini",
  "java",
  "javascript",
  "json",
  "kotlin",
  "less",
  "lua",
  "markdown",
  "php",
  "plaintext",
  "powershell",
  "python",
  "r",
  "ruby",
  "rust",
  "scss",
  "shell",
  "sql",
  "swift",
  "typescript",
  "xml",
  "yaml",
]);

/** What people type for a language, mapped to Monaco's id for it. */
const LANGUAGE_ALIASES: Readonly<Record<string, string>> = {
  bash: "shell",
  "c#": "csharp",
  "c++": "cpp",
  cs: "csharp",
  docker: "dockerfile",
  golang: "go",
  js: "javascript",
  jsx: "javascript",
  kt: "kotlin",
  md: "markdown",
  ps1: "powershell",
  py: "python",
  rb: "ruby",
  rs: "rust",
  sh: "shell",
  terminal: "shell",
  toml: "ini",
  ts: "typescript",
  tsx: "typescript",
  yml: "yaml",
  zsh: "shell",
};

/**
 * The Monaco language id for an item's free-text `language`: case and
 * surrounding spaces ignored, common aliases ("ts", "bash") resolved, and
 * anything unknown shown as plain text rather than mis-highlighted.
 */
export const monacoLanguageFor = (language: string | null | undefined): string => {
  const key = language?.trim().toLowerCase() ?? "";
  if (MONACO_LANGUAGES.has(key)) return key;
  // `Object.hasOwn`: a plain lookup would find "constructor" on the prototype.
  return Object.hasOwn(LANGUAGE_ALIASES, key) ? LANGUAGE_ALIASES[key] : PLAIN_TEXT;
};

/** The language as the editor header shows it: the user's own spelling, trimmed. */
export const codeLanguageLabel = (language: string | null | undefined): string =>
  language?.trim() || CODE_LANGUAGE_FALLBACK_LABEL;
