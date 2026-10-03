import type { Metadata } from "next";
import Link from "next/link";

import { resetPasswordAction } from "@/actions/auth";
import { ActionForm } from "@/components/shared/ActionForm";
import { FormError, FormField } from "@/components/shared/FormField";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { firstParam } from "@/lib/auth-redirect";
import { PASSWORD_MIN_LENGTH } from "@/lib/constants/limits";
import { RESET_TOKEN_ERRORS } from "@/lib/constants/messages/auth";
import { ROUTES } from "@/lib/constants/routes";
import { redirectIfSignedIn } from "@/lib/db/current-user";
import { checkResetToken } from "@/lib/password-reset";

export const metadata: Metadata = {
  title: "Reset password",
  // The token is in this page's URL: never send it on as a Referer.
  referrer: "no-referrer",
};

const linkClass = "text-foreground underline-offset-4 hover:underline";

const ResetPasswordPage = async ({ searchParams }: PageProps<"/reset-password">) => {
  // DB-backed for the same reason as on /sign-in: avoids a redirect loop.
  await redirectIfSignedIn();

  const token = firstParam((await searchParams).token) ?? "";
  // Checked, not used up: the token is only consumed when the form submits.
  const status = token ? await checkResetToken(token) : "invalid";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset password</CardTitle>
        <CardDescription>
          {status === "valid" ? "Choose a new password for your account." : RESET_TOKEN_ERRORS[status]}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        {status === "valid" ? (
          <ActionForm action={resetPasswordAction} className="grid gap-4">
            <input type="hidden" name="token" value={token} />
            <FormField
              name="password"
              label="New password"
              type="password"
              autoComplete="new-password"
              minLength={PASSWORD_MIN_LENGTH}
              required
            />
            <FormField
              name="confirmPassword"
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              required
            />
            <FormError />
            <SubmitButton pendingLabel="Updating…">Update password</SubmitButton>
          </ActionForm>
        ) : null}
        <p className="text-muted-foreground text-center text-sm">
          <Link href={ROUTES.forgotPassword} className={linkClass}>
            Request a new link
          </Link>
          {" · "}
          <Link href={ROUTES.signIn} className={linkClass}>
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
};

export default ResetPasswordPage;
