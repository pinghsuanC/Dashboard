import { registerSchema } from "@/lib/auth-schemas";
import { registerPasswordUser } from "@/lib/register-user";

interface RegisterResponse {
  success: boolean;
  data?: { id: string; email: string };
  error?: string;
}

const respond = (body: RegisterResponse, status: number) => Response.json(body, { status });

// Static segment, so it wins over the `[...nextauth]` catch-all next to it.
// Kept for non-browser clients; the register page uses a server action that
// shares `registerPasswordUser` with this route.
export const POST = async (request: Request) => {
  const body: unknown = await request.json().catch(() => null);
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return respond({ success: false, error: "Invalid request body" }, 400);
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return respond({ success: false, error: parsed.error.issues[0].message }, 400);
  }

  const result = await registerPasswordUser(parsed.data);
  if (!result.success) {
    return respond({ success: false, error: result.error }, result.status);
  }
  return respond({ success: true, data: result.data }, 201);
};
