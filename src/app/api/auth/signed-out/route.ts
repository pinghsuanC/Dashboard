import { NextResponse } from "next/server";

import { ROUTES, SIGNED_OUT_FORWARDED_FLAGS, withFlag } from "@/lib/constants/routes";
import { SIGNED_OUT_CLEAR_SITE_DATA } from "@/lib/constants/security";

// Where sign-out and account deletion land. A server action can't set
// response headers, so the cache is cleared here, on the way to /sign-in.
// Static segment, so it wins over the `[...nextauth]` catch-all next to it;
// public under /api/auth, and harmless to anyone: it only clears the caller's
// own cache. Only `SIGNED_OUT_FORWARDED_FLAGS` pass on; any other query is
// dropped.
export const GET = async (request: Request) => {
  const params = new URL(request.url).searchParams;
  const flag = SIGNED_OUT_FORWARDED_FLAGS.find(({ param, value }) => params.get(param) === value);
  const signIn = flag ? withFlag(ROUTES.signIn, flag) : ROUTES.signIn;

  const response = NextResponse.redirect(new URL(signIn, request.url));
  response.headers.set("Clear-Site-Data", SIGNED_OUT_CLEAR_SITE_DATA);
  return response;
};
