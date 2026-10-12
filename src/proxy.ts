import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import authConfig from "@/auth.config";
import { signInHref } from "@/lib/auth/auth-redirect";
import { API_ROUTES } from "@/lib/constants/routes";
import { UNAUTHORIZED } from "@/lib/constants/messages/common";

// Built from the edge-safe config only: importing `@/auth` here would pull
// Prisma into the proxy. Verifying the JWT cookie needs no database.
const { auth } = NextAuth(authConfig);

export const proxy = auth((req) => {
  if (req.auth) return NextResponse.next();

  // An API caller is a fetch or an <img>, which would follow a redirect and
  // get the sign-in page as its body: tell it plainly instead.
  if (req.nextUrl.pathname.startsWith(`${API_ROUTES.root}/`)) {
    return NextResponse.json({ error: UNAUTHORIZED }, { status: 401 });
  }

  // callbackUrl brings the user back to the page they asked for. A path, not
  // the full href, so it passes `safeCallbackUrl` on the sign-in page.
  const callbackUrl = req.nextUrl.pathname + req.nextUrl.search;
  return NextResponse.redirect(
    new URL(signInHref(callbackUrl), req.nextUrl.origin),
  );
});

// Literal on purpose: Next reads `matcher` statically and ignores variables.
// Keep it in step with the protected pages in `ROUTES` (lib/constants/routes.ts).
// Every API route except Auth.js's and the signed-out ones under /api/auth.
// Routes still check the session themselves: this only verifies the JWT, and
// a revoked session (`sessionVersion`) is only seen by `getCurrentUser()`.
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/collections/:path*",
    "/items/:path*",
    "/api/((?!auth/).*)",
  ],
};
