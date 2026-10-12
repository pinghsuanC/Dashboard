import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { pageHref } from "@/lib/constants/routes";
import { pageLinks } from "@/lib/helpers/pagination";
import { cn } from "@/lib/utils";

interface PaginationProps {
  /** The listing's path without a query: `/items/snippets`. */
  path: string;
  page: number;
  pageCount: number;
}

interface StepLinkProps {
  href: string | null;
  label: string;
  children: ReactNode;
}

/**
 * Previous or Next: a link, or with nowhere to go a greyed-out span, so it
 * can't be clicked or tabbed to. The label hides on narrow screens, leaving
 * the chevron, so the row fits a phone.
 */
const StepLink = ({ href, label, children }: StepLinkProps) => {
  const className = cn(buttonVariants({ variant: "ghost" }), "gap-1 px-2");
  return href ? (
    <Link href={href} className={className} aria-label={label}>
      {children}
    </Link>
  ) : (
    // `role="link"`: without a role, screen readers ignore `aria-disabled` and the label.
    <span role="link" className={cn(className, "pointer-events-none opacity-50")} aria-disabled="true" aria-label={label}>
      {children}
    </span>
  );
};

/**
 * Numbered page links with Previous and Next, below a paginated listing.
 * Server-rendered `next/link`s, not `<a>`s: a client navigation keeps the
 * `(app)` layout, so the user session isn't reloaded on every page turn.
 * Nothing renders for a single page.
 */
export const Pagination = ({ path, page, pageCount }: PaginationProps) => {
  if (pageCount <= 1) return null;

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1">
      <StepLink href={page > 1 ? pageHref(path, page - 1) : null} label="Previous page">
        <ChevronLeft className="size-4" />
        <span className="hidden sm:inline">Previous</span>
      </StepLink>

      <ul className="flex items-center gap-1">
        {pageLinks(page, pageCount).map((link, index) =>
          link === "gap" ? (
            <li key={`gap-${index}`} aria-hidden="true" className="text-muted-foreground flex size-8 items-center justify-center">
              <MoreHorizontal className="size-4" />
            </li>
          ) : (
            <li key={link}>
              <Link
                href={pageHref(path, link)}
                aria-current={link === page ? "page" : undefined}
                aria-label={`Page ${link}`}
                className={buttonVariants({ variant: link === page ? "outline" : "ghost", size: "icon" })}
              >
                {link}
              </Link>
            </li>
          ),
        )}
      </ul>

      <StepLink href={page < pageCount ? pageHref(path, page + 1) : null} label="Next page">
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="size-4" />
      </StepLink>
    </nav>
  );
};
