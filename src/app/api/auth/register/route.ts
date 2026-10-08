import { registerSchema } from "@/lib/auth/auth-schemas";
import { rateLimitMessage, retryAfterSeconds } from "@/lib/auth/rate-limit-messages";
import { checkRegisterRateLimit } from "@/lib/auth/register-rate-limit";
import { registerPasswordUser } from "@/lib/auth/register-user";
import { INVALID_REQUEST_BODY } from "@/lib/constants/messages/common";

interface RegisterResponse {
  success: boolean;
  error?: string;
}

const respond = (body: RegisterResponse, status: number, headers?: HeadersInit) =>
  Response.json(body, { status, headers });

// Static segment, so it wins over the `[...nextauth]` catch-all next to it.
// Kept for non-browser clients; the register page uses a server action that
// shares `registerPasswordUser` with this route. A taken email gets the same
// 202 as a new one (no 409, no user id), so the route can't be used to check
// whether an email has an account. Shares the register action's limits (per IP and
// per email), counted once the body is valid.
export const POST = async (request: Request) => {
  const body: unknown = await request.json().catch(() => null);
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return respond({ success: false, error: INVALID_REQUEST_BODY }, 400);
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return respond({ success: false, error: parsed.error.issues[0].message }, 400);
  }

  const limit = await checkRegisterRateLimit(request.headers, parsed.data.email);
  if (!limit.success) {
    return respond({ success: false, error: rateLimitMessage(limit.reset) }, 429, {
      "Retry-After": String(retryAfterSeconds(limit.reset)),
    });
  }

  const result = await registerPasswordUser(parsed.data);
  if (!result.success) {
    return respond({ success: false, error: result.error }, result.status);
  }
  return respond({ success: true }, 202);
};
