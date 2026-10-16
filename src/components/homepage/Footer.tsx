import Link from "next/link";

import { CurrentYear } from "@/components/homepage/CurrentYear";
import { Logo } from "@/components/homepage/Logo";
import { APP_NAME } from "@/lib/constants/app";
import { ROUTES } from "@/lib/constants/routes";

// Only pages that exist. The spec's Resources and Company columns come back
// once there are pages to link (docs, changelog, privacy, about); until then
// a column of href="#" links would only jump to the top.
const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "#pricing" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Get Started", href: ROUTES.register },
      { label: "Sign In", href: ROUTES.signIn },
      { label: "Forgot password", href: ROUTES.forgotPassword },
    ],
  },
] as const;

/** Brand, link columns and the copyright line. The year is the visitor's, see `CurrentYear`. */
export const Footer = () => {
  return (
    <footer className="border-t pt-16 pb-8 text-sm">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:grid-cols-[2fr_1fr_1fr] sm:px-6">
        <div>
          <Logo />
          <p className="text-muted-foreground mt-3">Your tech knowledge, stashed and searchable.</p>
        </div>
        {COLUMNS.map(({ title, links }) => (
          <nav key={title} aria-label={title} className="flex flex-col gap-2.5">
            <h3 className="text-muted-foreground mb-1 text-xs font-semibold tracking-wider uppercase">{title}</h3>
            {links.map(({ label, href }) =>
              href.startsWith("#") ? (
                <a key={label} href={href} className="text-muted-foreground hover:text-foreground">
                  {label}
                </a>
              ) : (
                <Link key={label} href={href} className="text-muted-foreground hover:text-foreground">
                  {label}
                </Link>
              ),
            )}
          </nav>
        ))}
      </div>
      <div className="text-muted-foreground mx-auto mt-12 max-w-6xl border-t px-4 pt-6 sm:px-6">
        <p>
          &copy; <CurrentYear fallback={new Date().getFullYear()} /> {APP_NAME}. All rights reserved.
        </p>
      </div>
    </footer>
  );
};
