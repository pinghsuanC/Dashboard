import { hash } from "bcryptjs";

import { Prisma } from "@/generated/prisma/client";
import { registerSchema } from "@/lib/auth-schemas";
import { prisma } from "@/lib/prisma";

const BCRYPT_ROUNDS = 12;

interface RegisterResponse {
  success: boolean;
  data?: { id: string; email: string };
  error?: string;
}

const respond = (body: RegisterResponse, status: number) => Response.json(body, { status });

// Static segment, so it wins over the `[...nextauth]` catch-all next to it.
export const POST = async (request: Request) => {
  const body: unknown = await request.json().catch(() => null);
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return respond({ success: false, error: "Invalid request body" }, 400);
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return respond({ success: false, error: parsed.error.issues[0].message }, 400);
  }

  const { name, email, password } = parsed.data;

  // Case-insensitive: the unique index is not, and GitHub-created rows keep
  // the provider's casing.
  const existing = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) {
    return respond({ success: false, error: "An account with this email already exists" }, 409);
  }

  try {
    const user = await prisma.user.create({
      data: { name, email, passwordHash: await hash(password, BCRYPT_ROUNDS) },
      select: { id: true, email: true },
    });
    return respond({ success: true, data: user }, 201);
  } catch (error) {
    // Two requests racing past the check above.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return respond({ success: false, error: "An account with this email already exists" }, 409);
    }
    console.error("Registration failed", error);
    return respond({ success: false, error: "Registration failed" }, 500);
  }
};
