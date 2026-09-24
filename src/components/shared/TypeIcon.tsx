import { createElement, type CSSProperties } from "react";

import { getItemTypeIcon } from "@/lib/item-type-icons";
import { cn } from "@/lib/utils";

/**
 * Structural, so both mock `ItemType`s and database rows fit. `icon` is
 * nullable in the schema; a missing icon falls back to the generic one.
 */
interface TypeIconType {
  label: string;
  icon: string | null;
  color: string;
}

interface TypeIconProps {
  /** Undefined when an item names a type that no longer exists. */
  type?: TypeIconType;
  className?: string;
}

/**
 * Renders an item type's lucide glyph in the type's own colour.
 *
 * `createElement` rather than `const Icon = getItemTypeIcon(...)`: the icon
 * component is chosen from data at render time, and binding it to a capitalized
 * local in a component body trips `react-hooks/static-components`. Keeping the
 * dynamic lookup in one place means every call site gets the same treatment.
 */
export const TypeIcon = ({ type, className }: TypeIconProps) => {
  return createElement(getItemTypeIcon(type?.icon ?? ""), {
    role: "img",
    "aria-label": type?.label ?? "Unknown type",
    className: cn("text-(--type-color)", className),
    style: {
      "--type-color": type?.color ?? "var(--muted-foreground)",
    } as CSSProperties,
  });
};
