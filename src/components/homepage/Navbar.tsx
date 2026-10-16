"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

import { Logo } from "@/components/homepage/Logo";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

const SECTION_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
] as const;

/** Tailwind's `md` breakpoint (48rem), where the hamburger gives way to the inline links. */
const MD_UP = "(min-width: 48rem)";

/**
 * Fixed top bar: logo, section links, Sign In and Get Started. It turns more
 * opaque once the page scrolls. Below `md` the links move into a menu behind a
 * hamburger, so Sign In is still one tap away on phones.
 */
export const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // While open: Escape closes it, and so does widening to `md`, where the menu
  // is hidden and would otherwise leave the bar stuck opaque.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    const desktop = window.matchMedia(MD_UP);
    const onWiden = () => {
      if (desktop.matches) setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    desktop.addEventListener("change", onWiden);
    return () => {
      document.removeEventListener("keydown", onKey);
      desktop.removeEventListener("change", onWiden);
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b backdrop-blur-md transition-colors duration-300",
        scrolled || menuOpen ? "bg-background/90 border-border" : "bg-background/30 border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-4 sm:px-6">
        <Logo />

        <nav aria-label="Sections" className="text-muted-foreground hidden gap-6 text-sm md:flex">
          {SECTION_LINKS.map(({ href, label }) => (
            <a key={href} href={href} className="hover:text-foreground transition-colors">
              {label}
            </a>
          ))}
        </nav>

        <div className="ml-auto hidden gap-2 md:flex">
          <Button asChild variant="outline">
            <Link href={ROUTES.signIn}>Sign In</Link>
          </Button>
          <Button asChild>
            <Link href={ROUTES.register}>Get Started</Link>
          </Button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="ml-auto md:hidden"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="homepage-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {menuOpen && (
        <nav id="homepage-menu" aria-label="Menu" className="border-t px-4 pt-2 pb-4 md:hidden">
          {SECTION_LINKS.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              onClick={closeMenu}
              className="text-muted-foreground hover:text-foreground block py-2.5 text-sm"
            >
              {label}
            </a>
          ))}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button asChild variant="outline">
              <Link href={ROUTES.signIn} onClick={closeMenu}>
                Sign In
              </Link>
            </Button>
            <Button asChild>
              <Link href={ROUTES.register} onClick={closeMenu}>
                Get Started
              </Link>
            </Button>
          </div>
        </nav>
      )}
    </header>
  );
};
