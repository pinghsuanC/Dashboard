import type { Metadata } from "next";

import { ChangePasswordForm } from "@/components/profile/ChangePasswordForm";
import { DeleteAccountDialog } from "@/components/profile/DeleteAccountDialog";
import { ProfileOverview } from "@/components/profile/ProfileOverview";
import { FlagToast } from "@/components/shared/FlagToast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { firstParam } from "@/lib/auth-redirect";

export const metadata: Metadata = { title: "Profile | DevStash" };

/**
 * Queries nothing: user info, item types and counts come from the user
 * session the `(app)` layout loaded. Only the one-shot toast flag is read
 * here, from the URL. The cards stay server components; only what reads the
 * session sits under `ProfileOverview`'s client boundary.
 */
const ProfilePage = async ({ searchParams }: PageProps<"/profile">) => {
  const passwordChanged = firstParam((await searchParams).password) === "changed";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      {passwordChanged ? (
        <FlagToast id="password-changed" title="Password updated" href="/profile" />
      ) : null}

      <header>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Profile</h1>
        <p className="text-muted-foreground mt-1">Your account and how you use DevStash</p>
      </header>

      <ProfileOverview
        passwordCard={
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
        }
      />

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

export default ProfilePage;
