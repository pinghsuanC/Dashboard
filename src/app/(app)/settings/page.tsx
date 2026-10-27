import type { Metadata } from "next";

import { ChangePasswordForm } from "@/components/settings/ChangePasswordForm";
import { DeleteAccountDialog } from "@/components/settings/DeleteAccountDialog";
import { EditorPreferencesForm } from "@/components/settings/EditorPreferencesForm";
import { PasswordSection } from "@/components/settings/PasswordSection";
import { FlagToast } from "@/components/shared/FlagToast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { hasFlag } from "@/lib/auth/auth-redirect";
import { PASSWORD_CHANGED_TOAST } from "@/lib/constants/messages/account";
import { FLAGS, ROUTES } from "@/lib/constants/routes";

export const metadata: Metadata = { title: "Settings" };

/**
 * Queries nothing: whether the user has a password, and their editor
 * preferences, come from the user session the `(app)` layout loaded. Only
 * the one-shot toast flag is read here, from the URL. The cards stay server
 * components; only the password check and the editor controls are client.
 * Billing lives on its own page, `/billings`.
 */
const SettingsPage = async ({ searchParams }: PageProps<"/settings">) => {
  const passwordChanged = hasFlag(await searchParams, FLAGS.passwordChanged);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      {passwordChanged ? (
        <FlagToast {...PASSWORD_CHANGED_TOAST} href={ROUTES.settings} />
      ) : null}

      <header>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Your editor, password and account</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Editor preferences</CardTitle>
          <CardDescription>For snippets and commands. Changes save automatically.</CardDescription>
        </CardHeader>
        <CardContent>
          <EditorPreferencesForm />
        </CardContent>
      </Card>

      <PasswordSection>
        <Card>
          <CardHeader>
            <CardTitle>Change password</CardTitle>
            <CardDescription>You&apos;ll stay signed in on this device.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* The action redirects back to this page, which keeps the form
                mounted with the typed passwords. A new key remounts it empty. */}
            <ChangePasswordForm key={passwordChanged ? "changed" : "form"} />
          </CardContent>
        </Card>
      </PasswordSection>

      <Card className="ring-destructive/30">
        <CardHeader>
          <CardTitle>Delete account</CardTitle>
          <CardDescription>Permanently remove your account and everything in it.</CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteAccountDialog />
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
