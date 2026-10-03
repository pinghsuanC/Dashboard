// Values the app compares env vars against or falls back to. The reads stay at
// their call sites as literal `process.env.NAME`, so they stay greppable and
// this folder stays safe to import from client components.

import { APP_NAME } from "@/lib/constants/app";

/**
 * `EMAIL_VERIFICATION` set to this (any case, trimmed) turns verification off.
 * Anything else, including unset, keeps it on.
 */
export const EMAIL_VERIFICATION_OFF = "off";

/**
 * Sender when `EMAIL_FROM` is unset. Resend's shared test sender needs no
 * domain setup, but it only delivers to the address that owns the Resend
 * account. Set `EMAIL_FROM` to an address on a verified domain before real
 * users register.
 */
export const DEFAULT_EMAIL_FROM = `${APP_NAME} <onboarding@resend.dev>`;
