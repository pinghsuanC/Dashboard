import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import authConfig from "@/auth.config";

// Built from the edge-safe config only: importing `@/auth` here would pull
// Prisma into the proxy. Verifying the JWT cookie needs no database.
const { auth } = NextAuth(authConfig);

export const proxy = auth((req) => {
  if (req.auth) return NextResponse.next();

  // NextAuth's default sign-in page; callbackUrl brings the user back to the
  // page they asked for once GitHub hands control back.
  const signInUrl = new URL("/api/auth/signin", req.nextUrl.origin);
  signInUrl.searchParams.set("callbackUrl", req.nextUrl.href);
  return NextResponse.redirect(signInUrl);
});

export const config = {
  matcher: ["/dashboard/:path*"],
};
