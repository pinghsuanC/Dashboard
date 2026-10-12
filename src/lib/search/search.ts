import { defaultFilter } from "cmdk";

import type { SessionCollection } from "@/types/collections";
import type { ItemSummary } from "@/types/items";

/**
 * What an item is found by: the text its card shows (title, type, description,
 * file name, tags). Bodies are never loaded for search, so they aren't matched.
 */
export const itemSearchKeywords = ({ title, type, description, fileName, tags }: ItemSummary): string[] =>
  [title, type.label, description, fileName, ...tags].filter((text): text is string => Boolean(text));

/** What a collection is found by: its name and description. */
export const collectionSearchKeywords = ({ name, description }: SessionCollection): string[] =>
  [name, description].filter((text): text is string => Boolean(text));

// A field match ranks below the same match in the title.
const FIELD_MATCH_WEIGHT = 0.5;

/**
 * How well a row matches, 0 for not at all. The title (`keywords[0]`) gets
 * cmdk's own fuzzy score: letters in order, gaps allowed, case ignored. The
 * other fields must contain the search as typed, since fuzzy letters spread
 * over a long description match nearly anything. Only keywords are scored:
 * cmdk's default filter also scores each row's `value`, which has to be
 * unique and is the id here, so a uuid fragment would match.
 */
export const searchScore = (search: string, keywords: string[]): number => {
  const query = search.trim().toLowerCase();
  if (!query) return 1;
  const [title = "", ...fields] = keywords;
  const fieldScores = fields
    .filter((field) => field.toLowerCase().includes(query))
    .map((field) => FIELD_MATCH_WEIGHT * defaultFilter("", query, [field]));
  return Math.max(defaultFilter("", query, [title]), ...fieldScores);
};

interface ShortcutKey {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  /** True for the auto-repeat of a held key. */
  repeat: boolean;
}

/**
 * Cmd+K or Ctrl+K on any platform, held or not; Shift or Alt makes it another
 * shortcut. The page always keeps it from the browser, whose own Ctrl+K jumps
 * to the address bar to search the web, even when the palette ignores it.
 */
export const ownsSearchShortcut = ({ key, metaKey, ctrlKey, altKey, shiftKey }: ShortcutKey): boolean =>
  (metaKey || ctrlKey) && !altKey && !shiftKey && key.toLowerCase() === "k";

/**
 * The shortcut the palette acts on: a held key's auto-repeat doesn't count,
 * or holding it would flicker the palette open and shut.
 */
export const isSearchShortcut = (event: ShortcutKey): boolean => ownsSearchShortcut(event) && !event.repeat;

/** The hint by `navigator.platform`: Apple devices show ⌘K, the rest Ctrl K. */
export const searchShortcutLabel = (platform: string): string =>
  /mac|iphone|ipad|ipod/i.test(platform) ? "⌘K" : "Ctrl K";

interface SearchShortcutState {
  paletteOpen: boolean;
  /** The item drawer or another dialog, not the palette itself. */
  otherDialogOpen: boolean;
}

/**
 * What a key press does to the palette. While another dialog is open it does
 * nothing: that dialog keeps the keyboard focus (typing would land in it, and
 * Escape would close it), and picking an item would replace the drawer and
 * drop an unsaved edit.
 */
export const searchShortcutAction = (
  event: ShortcutKey,
  { paletteOpen, otherDialogOpen }: SearchShortcutState,
): "open" | "close" | null => {
  if (!isSearchShortcut(event)) return null;
  if (paletteOpen) return "close";
  return otherDialogOpen ? null : "open";
};
