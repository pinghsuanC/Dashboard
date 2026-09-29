import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { signInWithCredentials } from "@/actions/auth";
import { GitHubSignInButton } from "@/components/auth/GitHubSignInButton";
import { RegisteredToast } from "@/components/auth/RegisteredToast";
import { ActionForm } from "@/components/shared/ActionForm";
import { FormError, FormField } from "@/components/shared/FormField";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { firstParam, safeCallbackUrl } from "@/lib/auth-redirect";
import { getCurrentUser } from "@/lib/db/current-user";

export const metadata: Metadata = { title: "Sign in · DevStash" };

// Auth.js sends its error codes here via `pages.error`.
const ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked:
    "An account with this email already exists. Sign in the way you did before.",
  AccessDenied: "Access was denied.",
  Configuration: "Sign-in is misconfigured. Please try again later.",
};
const DEFAULT_ERROR = "Sign-in failed. Please try again.";

const SignInPage = async ({ searchParams }: PageProps<"/sign-in">) => {
  const params = await searchParams;
  const callbackUrl = safeCallbackUrl(firstParam(params.callbackUrl));

  // The DB-backed check, not bare `auth()`: a valid JWT whose user row is
  // gone would bounce between here and the dashboard layout forever.
  if (await getCurrentUser()) redirect(callbackUrl);

  const errorCode = firstParam(params.error);
  const error = errorCode ? (ERROR_MESSAGES[errorCode] ?? DEFAULT_ERROR) : null;
  const registered = firstParam(params.registered) === "1";
  const registerHref = `/register?${new URLSearchParams({ callbackUrl })}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Welcome back to DevStash.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        {registered ? <RegisteredToast callbackUrl={callbackUrl} /> : null}
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
