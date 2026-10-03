import { z } from "zod";

import { NAME_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/constants/limits";
import { ACCOUNT_MESSAGES } from "@/lib/constants/messages/account";
import { AUTH_MESSAGES } from "@/lib/constants/messages/auth";
import { MAX_PASSWORD_BYTES } from "@/lib/constants/security";

// Trimmed and lowercased before the format check, so sign-in and register
// agree on one spelling of every address.
const email = z.string().trim().toLowerCase().pipe(z.email(AUTH_MESSAGES.invalidEmail));

// Bytes, not characters: see MAX_PASSWORD_BYTES.
const fitsBcrypt = (value: string) => new TextEncoder().encode(value).length <= MAX_PASSWORD_BYTES;

const password = z
  .string()
  .min(PASSWORD_MIN_LENGTH, AUTH_MESSAGES.passwordTooShort)
  .refine(fitsBcrypt, AUTH_MESSAGES.passwordTooLong);

export const signInSchema = z.object({
  email,
  password: z.string().min(1).refine(fitsBcrypt),
});

// Shared by register and reset: both ask for the new password twice.
const passwordsMatch = (data: { password: string; confirmPassword: string }) =>
  data.password === data.confirmPassword;
const mismatch = { message: AUTH_MESSAGES.passwordsDontMatch, path: ["confirmPassword"] };

export const registerSchema = z
  .object({
    name: z.string().trim().min(1, AUTH_MESSAGES.nameRequired).max(NAME_MAX_LENGTH),
    email,
    password,
    confirmPassword: z.string(),
  })
  .refine(passwordsMatch, mismatch);

export const forgotPasswordSchema = z.object({ email });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, ACCOUNT_MESSAGES.enterCurrentPassword).refine(fitsBcrypt),
    password,
    confirmPassword: z.string(),
  })
  .refine(passwordsMatch, mismatch)
  .refine((data) => data.password !== data.currentPassword, {
    message: ACCOUNT_MESSAGES.newPasswordMustDiffer,
    path: ["password"],
  });

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password,
    confirmPassword: z.string(),
  })
  .refine(passwordsMatch, mismatch);
