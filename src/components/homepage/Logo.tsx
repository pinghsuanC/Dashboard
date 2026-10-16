"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Layers } from "lucide-react";

import { APP_NAME } from "@/lib/constants/app";
import { ROUTES } from "@/lib/constants/routes";

/**
 * Logo mark and name, linking home. Shared by the navbar and the footer.
 * Already on the homepage, a Link to "/" does nothing (Next won't scroll for
 * the current URL), so it scrolls back to the top instead and drops any
 * #features / #pricing from the address. Smooth unless reduced motion, via the
 * `scroll-smooth` class on <html>.
 */
export const Logo = () => {
  const pathname = usePathname();

  const onClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (pathname !== ROUTES.home) return;
    // Let modified clicks (new tab, new window) through untouched.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    window.scrollTo({ top: 0 });
    if (window.location.hash) window.history.replaceState(window.history.state, "", ROUTES.home);
  };

  return (
    <Link href={ROUTES.home} onClick={onClick} className="flex items-center gap-2.5 text-[17px] font-bold">
      <span className="grid size-[30px] place-items-center rounded-lg bg-linear-to-br from-blue-600 to-blue-400">
        <Layers className="size-[18px] text-white" />
      </span>
      {APP_NAME}
    </Link>
  );
};
