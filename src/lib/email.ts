import { Resend } from "resend";

import { verificationEmail } from "@/lib/email-templates";

// Resend's shared test sender needs no domain setup, but it only delivers to
// the address that owns the Resend account. Set EMAIL_FROM to an address on a
// verified domain before real users register.
const DEFAULT_FROM = "Stashboard <onboarding@resend.dev>";

let client: Resend | undefined;

// Built on first send, so a missing key fails the send, not the import.
const resend = (): Resend => {
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not set");
  client ??= new Resend(process.env.RESEND_API_KEY);
  return client;
};

/** Sends the link from `/api/auth/verify-email`. Throws when Resend rejects it. */
export const sendVerificationEmail = async (to: string, link: string): Promise<void> => {
  const { error } = await resend().emails.send({
    from: process.env.EMAIL_FROM ?? DEFAULT_FROM,
    to,
    ...verificationEmail(link),
  });
  if (error) throw new Error(`Resend: ${error.message}`);
};
