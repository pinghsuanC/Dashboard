import { NextResponse, type NextRequest } from "next/server";

import { signInHref } from "@/lib/auth/auth-redirect";
import { verifyEmailToken } from "@/lib/auth/email-verification";

// The link in the verification email. Static segment, so it wins over the
// `[...nextauth]` catch-all next to it. The outcome lands on /sign-in as
// `?verify=`, where the page shows the matching message.
export const GET = async (request: NextRequest) => {
  const token = request.nextUrl.searchParams.get("token");
  const verify = token ? await verifyEmailToken(token) : "invalid";
  return NextResponse.redirect(new URL(signInHref(undefined, { verify }), request.nextUrl.origin));
};
