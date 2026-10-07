import type { Metadata } from "next";
import Link from "next/link";

import { registerWithCredentials } from "@/actions/auth";
import { ActionForm } from "@/components/shared/ActionForm";
import { FormError, FormField } from "@/components/shared/FormField";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { firstParam, safeCallbackUrl, signInHref } from "@/lib/auth/auth-redirect";
import { PASSWORD_MIN_LENGTH } from "@/lib/constants/limits";
import { redirectIfSignedIn } from "@/services/auth/session";

export const metadata: Metadata = { title: "Register" };

const RegisterPage = async ({ searchParams }: PageProps<"/register">) => {
  const callbackUrl = safeCallbackUrl(firstParam((await searchParams).callbackUrl));

  // DB-backed for the same reason as on /sign-in: avoids a redirect loop.
  await redirectIfSignedIn(callbackUrl);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>Start stashing your developer knowledge.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        {/* The server action validates with the same Zod schema as the API
            route; the HTML attributes only catch the obvious mistakes early. */}
        <ActionForm action={registerWithCredentials} className="grid gap-4">
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <FormField name="name" label="Name" autoComplete="name" required />
          <FormField name="email" label="Email" type="email" autoComplete="email" required />
          <FormField
            name="password"
            label="Password"
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
          <SubmitButton pendingLabel="Creating account…">Create account</SubmitButton>
        </ActionForm>
        <p className="text-muted-foreground text-center text-sm">
          Already have an account?{" "}
          <Link
            href={signInHref(callbackUrl)}
            className="text-foreground underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
};

export default RegisterPage;
