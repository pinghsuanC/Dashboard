import type { Metadata } from "next";
import Link from "next/link";

import { signInWithCredentials } from "@/actions/auth";
import { GitHubSignInButton } from "@/components/auth/GitHubSignInButton";
import { ActionForm } from "@/components/shared/ActionForm";
import { FlagToast } from "@/components/shared/FlagToast";
import { FormError, FormField } from "@/components/shared/FormField";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { firstParam, hasFlag, safeCallbackUrl, signInHref } from "@/lib/auth-redirect";
import { APP_NAME } from "@/lib/constants/app";
import { SIGN_IN_TOASTS } from "@/lib/constants/messages/auth";
import { FLAGS, ROUTES } from "@/lib/constants/routes";
import { redirectIfSignedIn } from "@/lib/db/current-user";
import { isEmailVerificationEnabled } from "@/lib/email-verification";
import { signInErrorMessage, verifyNotice } from "@/lib/sign-in-notices";

export const metadata: Metadata = { title: "Sign in" };

// One-shot flags from the register, reset-password and delete-account actions.
const signInToast = (params: Record<string, string | string[] | undefined>) => {
  if (hasFlag(params, FLAGS.registered)) {
    return isEmailVerificationEnabled()
      ? SIGN_IN_TOASTS.registeredCheckEmail
      : SIGN_IN_TOASTS.registeredNoVerification;
  }
  if (hasFlag(params, FLAGS.reset)) return SIGN_IN_TOASTS.passwordReset;
  if (hasFlag(params, FLAGS.deleted)) return SIGN_IN_TOASTS.accountDeleted;
  return null;
};

const SignInPage = async ({ searchParams }: PageProps<"/sign-in">) => {
  const params = await searchParams;
  const callbackUrl = safeCallbackUrl(firstParam(params.callbackUrl));

  // The DB-backed check, not bare `auth()`: a valid JWT whose user row is
  // gone would bounce between here and the dashboard layout forever.
  await redirectIfSignedIn(callbackUrl);

  const error = signInErrorMessage(firstParam(params.error));
  const verify = verifyNotice(firstParam(params.verify));
  const toast = signInToast(params);
  const registerHref = `${ROUTES.register}?${new URLSearchParams({ callbackUrl })}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Welcome back to {APP_NAME}.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        {toast ? <FlagToast {...toast} href={signInHref(callbackUrl)} /> : null}
        {verify ? (
          <p
            role={verify.ok ? "status" : "alert"}
            className={verify.ok ? "text-sm text-emerald-500" : "text-destructive text-sm"}
          >
            {verify.text}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}

        <GitHubSignInButton callbackUrl={callbackUrl} />

        <div className="text-muted-foreground flex items-center gap-3 text-xs uppercase">
          <span className="bg-border h-px flex-1" />
          or
          <span className="bg-border h-px flex-1" />
        </div>

        <ActionForm action={signInWithCredentials} className="grid gap-4">
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <FormField name="email" label="Email" type="email" autoComplete="email" required />
          <FormField
            name="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            labelAction={
              // Beside the label, it's tabbed to before the password field
              // rather than between it and Sign in.
              <Link
                href={ROUTES.forgotPassword}
                className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
              >
                Forgot password?
              </Link>
            }
          />
          <FormError />
          <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
        </ActionForm>

        <p className="text-muted-foreground text-center text-sm">
          No account?{" "}
          <Link href={registerHref} className="text-foreground underline-offset-4 hover:underline">
            Register
          </Link>
        </p>
      </CardContent>
    </Card>
  );
};

export default SignInPage;
