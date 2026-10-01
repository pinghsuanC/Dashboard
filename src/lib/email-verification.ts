import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";

import { sendVerificationEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

/**
 * `EMAIL_VERIFICATION=off` lets password users register and sign in without
 * an email, so the app runs without Resend. Anything else, including unset,
 * keeps verification on: a deploy that forgets the variable stays closed.
 * Users who registered while it was off stay unverified, so turning it back
 * on blocks their next sign-in and mails them a link.
 */
export const isEmailVerificationEnabled = (): boolean =>
  process.env.EMAIL_VERIFICATION?.trim().toLowerCase() !== "off";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
// A fresh token is only issued once the last one is this old, so repeated
// sign-in attempts don't flood the inbox.
const RESEND_COOLDOWN_MS = 2 * 60 * 1000;

// Only the hash is stored: a leaked row can't be replayed as a link.
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

// hostname[:port] only, so a forged header can't smuggle a path or markup.
const HOST_PATTERN = /^[a-z0-9.-]+(:\d+)?$/i;

/**
 * Where the link points. AUTH_URL wins when set; otherwise the request's
 * `host`, which is right on localhost and on Vercel. `x-forwarded-host` is
 * ignored: a proxy that passes it through from the client would let anyone
 * mail a valid token to a link on their own domain.
 */
const appOrigin = async (): Promise<string> => {
  if (process.env.AUTH_URL) return new URL(process.env.AUTH_URL).origin;
  const h = await headers();
  const host = h.get("host") ?? "";
  if (!HOST_PATTERN.test(host)) throw new Error(`Refusing to build a link for host: ${host}`);
  const isLocal = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  return `${isLocal ? "http" : "https"}://${host}`;
};

/**
 * Replaces any earlier token for this email and mails a new link. Call it from
 * a request (server action or route handler); it reads the request's host.
 */
export const sendVerificationLink = async (email: string): Promise<void> => {
  const token = randomBytes(32).toString("base64url");
  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { identifier: email } }),
    prisma.verificationToken.create({
      data: {
        identifier: email,
        token: hashToken(token),
        expires: new Date(Date.now() + TOKEN_TTL_MS),
      },
    }),
  ]);

  const link = `${await appOrigin()}/api/auth/verify-email?${new URLSearchParams({ token })}`;
  await sendVerificationEmail(email, link);
};

/** Sends a new link unless one went out within the cooldown. Never throws. */
export const resendVerificationLink = async (email: string): Promise<void> => {
  try {
    const latest = await prisma.verificationToken.findFirst({
      where: { identifier: email },
      orderBy: { expires: "desc" },
      select: { expires: true },
    });
    const issuedAt = latest ? latest.expires.getTime() - TOKEN_TTL_MS : 0;
    if (Date.now() - issuedAt < RESEND_COOLDOWN_MS) return;

    await sendVerificationLink(email);
  } catch (error) {
    console.error("Resending verification email failed", error);
  }
};

export type VerifyResult = "success" | "expired" | "invalid";

/**
 * Marks the email verified and deletes the token, so each link works once.
 * The delete's count is the one-time check: two requests racing on the same
 * link both find the row, but only one deletes it.
 * Known issue: mail scanners that prefetch links (e.g. Outlook Safe Links) can
 * use the token up before the user clicks. The account is verified all the
 * same; the user just sees "invalid" and can sign in anyway.
 */
export const verifyEmailToken = async (token: string): Promise<VerifyResult> => {
  const row = await prisma.verificationToken.findUnique({
    where: { token: hashToken(token) },
  });
  if (!row) return "invalid";

  if (row.expires < new Date()) {
    await prisma.verificationToken.deleteMany({ where: { token: row.token } });
    return "expired";
  }

  return prisma.$transaction(async (tx) => {
    const { count } = await tx.verificationToken.deleteMany({ where: { token: row.token } });
    if (count === 0) return "invalid";
    await tx.user.updateMany({
      where: { email: row.identifier, emailVerified: null },
      data: { emailVerified: new Date() },
    });
    return "success";
  });
};
