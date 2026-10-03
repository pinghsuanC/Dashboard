import type { Metadata } from "next";
import Link from "next/link";

import { signInWithCredentials } from "@/actions/auth";
import { GitHubSignInButton } from "@/components/auth/GitHubSignInButton";
import { ActionForm } from "@/components/shared/ActionForm";
import { FlagToast } from "@/components/shared/FlagToast";
import { FormError, FormField } from "@/components/shared/FormField";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { firstParam, safeCallbackUrl, signInHref } from "@/lib/auth-redirect";
import { redirectIfSignedIn } from "@/lib/db/current-user";
import { isEmailVerificationEnabled } from "@/lib/email-verification";
import { signInErrorMessage, verifyNotice } from "@/lib/sign-in-notices";

export const metadata: Metadata = { title: "Sign in · DevStash" };

// One-shot flags from the register, reset-password and delete-account actions.
const signInToast = (params: Record<string, string | string[] | undefined>) => {
  // Also shown when the email was already taken: register never says so.
  // With verification on, the inbox holds a verification link or a note that
  // the account exists, and "Check your email" is true of both.
  if (firstParam(params.registered) === "1") {
    return isEmailVerificationEnabled()
      ? {
          id: "registered",
          title: "Check your email",
          description: "We sent you a link to finish signing up.",
        }
      : { id: "registered", title: "Account created", description: "You can sign in now." };
  }
  if (firstParam(params.reset) === "1") {
    return {
      id: "password-reset",
      title: "Password updated",
      description: "Sign in with your new password.",
    };
  }
  if (firstParam(params.deleted) === "1") {
    return {
      id: "account-deleted",
      title: "Account deleted",
      description: "Your account and everything in it are gone.",
    };
  }
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
  const registerHref = `/register?${new URLSearchParams({ callbackUrl })}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Welcome back to DevStash.</CardDescription>
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
                href="/forgot-password"
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
