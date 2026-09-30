import { hash } from "bcryptjs";
import type { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import type { registerSchema } from "@/lib/auth-schemas";
import { sendVerificationLink } from "@/lib/email-verification";
import { prisma } from "@/lib/prisma";

const BCRYPT_ROUNDS = 12;
const EMAIL_TAKEN = "An account with this email already exists";

export type RegisterResult =
  | { success: true; data: { id: string; email: string } }
  | { success: false; error: string; status: 409 | 500 };

/**
 * Creates a password user from already-validated input. Shared by
 * `POST /api/auth/register` and the register page's server action.
 */
export const registerPasswordUser = async ({
  name,
  email,
  password,
}: z.output<typeof registerSchema>): Promise<RegisterResult> => {
  // Case-insensitive: the unique index is not, and GitHub-created rows keep
  // the provider's casing.
  const existing = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) return { success: false, error: EMAIL_TAKEN, status: 409 };

  try {
    const user = await prisma.user.create({
      data: { name, email, passwordHash: await hash(password, BCRYPT_ROUNDS) },
      select: { id: true, email: true },
    });
    // A failed send doesn't undo the account: signing in with the right
    // password mails a fresh link.
    await sendVerificationLink(user.email).catch((error: unknown) =>
      console.error("Sending verification email failed", error),
    );
    return { success: true, data: user };
  } catch (error) {
    // Two requests racing past the check above.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { success: false, error: EMAIL_TAKEN, status: 409 };
    }
    console.error("Registration failed", error);
    return { success: false, error: "Registration failed", status: 500 };
  }
};
