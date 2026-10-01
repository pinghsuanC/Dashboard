import { z } from "zod";

// Trimmed and lowercased before the format check, so sign-in and register
// agree on one spelling of every address.
const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email"));

// bcrypt only reads the first 72 bytes; anything past that would be ignored
// silently, so reject it instead. Bytes, not characters: accented letters and
// emoji take 2–4 bytes each in UTF-8.
const MAX_PASSWORD_BYTES = 72;
const fitsBcrypt = (value: string) => new TextEncoder().encode(value).length <= MAX_PASSWORD_BYTES;

const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .refine(fitsBcrypt, "Password is too long");

export const signInSchema = z.object({
  email,
  password: z.string().min(1).refine(fitsBcrypt),
});

// Shared by register and reset: both ask for the new password twice.
const passwordsMatch = (data: { password: string; confirmPassword: string }) =>
  data.password === data.confirmPassword;
const mismatch = { message: "Passwords do not match", path: ["confirmPassword"] };

export const registerSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(100),
    email,
    password,
    confirmPassword: z.string(),
  })
  .refine(passwordsMatch, mismatch);

export const forgotPasswordSchema = z.object({ email });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password").refine(fitsBcrypt),
    password,
    confirmPassword: z.string(),
  })
  .refine(passwordsMatch, mismatch)
  .refine((data) => data.password !== data.currentPassword, {
    message: "New password must be different",
    path: ["password"],
  });

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password,
    confirmPassword: z.string(),
  })
  .refine(passwordsMatch, mismatch);
