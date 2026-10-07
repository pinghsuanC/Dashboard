import { appOrigin, hashToken, newToken } from "@/lib/auth/auth-tokens";
import { EMAIL_VERIFICATION_OFF } from "@/lib/constants/env";
import { VERIFICATION_RESEND_COOLDOWN_MS, VERIFICATION_TOKEN_TTL_MS } from "@/lib/constants/limits";
import { API_ROUTES } from "@/lib/constants/routes";
import {
  consumeVerificationToken,
  deleteVerificationToken,
  findVerificationToken,
  latestVerificationExpiry,
  replaceVerificationToken,
} from "@/services/auth/tokens";
import { sendVerificationEmail } from "@/services/email";

/**
 * `EMAIL_VERIFICATION=off` lets password users register and sign in without
 * an email, so the app runs without Resend. Anything else, including unset,
 * keeps verification on: a deploy that forgets the variable stays closed.
 * Users who registered while it was off stay unverified, so turning it back
 * on blocks their next sign-in and mails them a link.
 */
export const isEmailVerificationEnabled = (): boolean =>
  process.env.EMAIL_VERIFICATION?.trim().toLowerCase() !== EMAIL_VERIFICATION_OFF;

/**
 * Replaces any earlier token for this email and mails a new link. Call it from
 * a request (server action or route handler); it reads the request's host.
 */
export const sendVerificationLink = async (email: string): Promise<void> => {
  const token = newToken();
  await replaceVerificationToken(
    email,
    hashToken(token),
    new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
  );

  const link = `${await appOrigin()}${API_ROUTES.verifyEmail}?${new URLSearchParams({ token })}`;
  await sendVerificationEmail(email, link);
};

/** Sends a new link unless one went out within the cooldown. Never throws. */
export const resendVerificationLink = async (email: string): Promise<void> => {
  try {
    const latest = await latestVerificationExpiry(email);
    const issuedAt = latest ? latest.getTime() - VERIFICATION_TOKEN_TTL_MS : 0;
    if (Date.now() - issuedAt < VERIFICATION_RESEND_COOLDOWN_MS) return;

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
  const row = await findVerificationToken(hashToken(token));
  if (!row) return "invalid";

  if (row.expires < new Date()) {
    await deleteVerificationToken(row.token);
    return "expired";
  }

  return (await consumeVerificationToken(row.token, row.identifier)) ? "success" : "invalid";
};
