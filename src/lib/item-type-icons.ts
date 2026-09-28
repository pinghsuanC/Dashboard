import {
  Code,
  File,
  Image,
  Link,
  Sparkles,
  StickyNote,
  Terminal,
  type LucideIcon,
} from "lucide-react";

/**
 * `ItemType.icon` is a lucide icon *name* ("Code", "Sparkles", ...) because a
 * database column can hold a string but not a React component. Resolving that
 * name to a component is therefore a UI concern and lives here, not in the
 * data layer. Keep this in sync with the seeded system types.
 */
const ITEM_TYPE_ICONS: Record<string, LucideIcon> = {
  Code,
  Sparkles,
  Terminal,
  StickyNote,
  File,
  Image,
  Link,
};

/**
 * Falls back to a generic file icon so an unknown custom type still renders.
 * Own keys only: a plain-object lookup would hand back `Object.prototype`
 * members for names like "constructor" and crash the render.
 */
export function getItemTypeIcon(name: string): LucideIcon {
  return Object.hasOwn(ITEM_TYPE_ICONS, name) ? ITEM_TYPE_ICONS[name] : File;
}
