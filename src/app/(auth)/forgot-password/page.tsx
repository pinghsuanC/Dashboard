import type { Metadata } from "next";
import Link from "next/link";

import { requestPasswordResetAction } from "@/actions/auth";
import { ActionForm } from "@/components/shared/ActionForm";
import { FormError, FormField } from "@/components/shared/FormField";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { firstParam } from "@/lib/auth-redirect";
import { redirectIfSignedIn } from "@/lib/db/current-user";

export const metadata: Metadata = { title: "Forgot password · DevStash" };

const linkClass = "text-foreground underline-offset-4 hover:underline";

const ForgotPasswordPage = async ({ searchParams }: PageProps<"/forgot-password">) => {
  // DB-backed for the same reason as on /sign-in: avoids a redirect loop.
  await redirectIfSignedIn();

  // Set by the action whether or not the email has an account.
  const sent = firstParam((await searchParams).sent) === "1";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Forgot password</CardTitle>
        <CardDescription>
          {sent
            ? "If an account with a password exists for that email, we sent a link to reset it. The link expires in 1 hour."
            : "Enter your email and we'll send you a link to reset your password."}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        {sent ? (
          <p className="text-muted-foreground text-sm">
            No email?{" "}
            <Link href="/forgot-password" className={linkClass}>
              Try again
            </Link>{" "}
            in a couple of minutes.
          </p>
        ) : (
          <ActionForm action={requestPasswordResetAction} className="grid gap-4">
            <FormField name="email" label="Email" type="email" autoComplete="email" required />
            <FormError />
            <SubmitButton pendingLabel="Sending…">Send reset link</SubmitButton>
          </ActionForm>
        )}
        <p className="text-muted-foreground text-center text-sm">
          Remembered it?{" "}
          <Link href="/sign-in" className={linkClass}>
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
};

export default ForgotPasswordPage;
