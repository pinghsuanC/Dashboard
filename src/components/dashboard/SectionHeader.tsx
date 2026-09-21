import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  /** Rendered before the title — the pin and clock markers in the reference. */
  icon?: LucideIcon;
  /** Adds a "View all" link on the trailing edge when present. */
  href?: string;
  /** `lg` for the headline sections, `sm` for the quieter item lists. */
  size?: "lg" | "sm";
}

export const SectionHeader = ({
  title,
  icon: Icon,
  href,
  size = "lg",
}: SectionHeaderProps) => {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <h2
        className={cn(
          "font-heading flex items-center gap-2",
          size === "lg"
            ? "text-xl font-semibold"
            : "text-muted-foreground text-sm font-medium",
        )}
      >
        {Icon && <Icon className="size-4" />}
        {title}
      </h2>

      {href && (
        <Link
          href={href}
          className="text-muted-foreground hover:text-foreground text-sm transition-colors"
        >
          View all
        </Link>
      )}
    </div>
  );
};
