import { Resend } from "resend";

import {
  accountExistsEmail,
  type EmailTemplate,
  passwordResetEmail,
  verificationEmail,
} from "@/lib/constants/emails";
import { DEFAULT_EMAIL_FROM } from "@/lib/constants/env";

let client: Resend | undefined;

// Built on first send, so a missing key fails the send, not the import.
const resend = (): Resend => {
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not set");
  client ??= new Resend(process.env.RESEND_API_KEY);
  return client;
};

const send = async (to: string, template: EmailTemplate): Promise<void> => {
  const { error } = await resend().emails.send({
    from: process.env.EMAIL_FROM ?? DEFAULT_EMAIL_FROM,
    to,
    ...template,
  });
  if (error) throw new Error(`Resend: ${error.message}`);
};

/** Sends the link from `/api/auth/verify-email`. Throws when Resend rejects it. */
export const sendVerificationEmail = (to: string, link: string): Promise<void> =>
  send(to, verificationEmail(link));

/** Sends the link to `/reset-password`. Throws when Resend rejects it. */
export const sendPasswordResetEmail = (to: string, link: string): Promise<void> =>
  send(to, passwordResetEmail(link));

/** Tells an existing user someone registered with their email. Throws when Resend rejects it. */
export const sendAccountExistsEmail = (
  to: string,
  signInLink: string,
  resetLink: string,
): Promise<void> => send(to, accountExistsEmail(signInLink, resetLink));
