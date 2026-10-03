import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import authConfig from "@/auth.config";
import { signInHref } from "@/lib/auth-redirect";

// Built from the edge-safe config only: importing `@/auth` here would pull
// Prisma into the proxy. Verifying the JWT cookie needs no database.
const { auth } = NextAuth(authConfig);

export const proxy = auth((req) => {
  if (req.auth) return NextResponse.next();

  // callbackUrl brings the user back to the page they asked for. A path, not
  // the full href, so it passes `safeCallbackUrl` on the sign-in page.
  const callbackUrl = req.nextUrl.pathname + req.nextUrl.search;
  return NextResponse.redirect(new URL(signInHref(callbackUrl), req.nextUrl.origin));
});

// Literal on purpose: Next reads `matcher` statically and ignores variables.
// Keep it in step with the protected pages in `ROUTES` (lib/constants/routes.ts).
export const config = {
  matcher: ["/dashboard/:path*", "/profile/:path*"],
};
