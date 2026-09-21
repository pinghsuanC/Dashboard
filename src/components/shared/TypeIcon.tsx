import { createElement, type CSSProperties } from "react";

import { getItemTypeIcon } from "@/lib/item-type-icons";
import type { ItemType } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

interface TypeIconProps {
  /** Undefined when an item or collection names a type that no longer exists. */
  type?: ItemType;
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
