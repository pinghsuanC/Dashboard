"use client";

import { ChangePasswordForm } from "@/components/profile/ChangePasswordForm";
import { DeleteAccountDialog } from "@/components/profile/DeleteAccountDialog";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileStats } from "@/components/profile/ProfileStats";
import { useUserSession } from "@/components/session/UserSessionProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ProfileOverviewProps {
  /** Set by the page from `?password=changed`; remounts the form empty. */
  passwordChanged: boolean;
}

/** The profile page body, read from the user session: no query on navigation. */
export const ProfileOverview = ({ passwordChanged }: ProfileOverviewProps) => {
  const { user, itemTypes, itemCounts, collections } = useUserSession();

  return (
    <>
      <ProfileHeader
        name={user.name}
        email={user.email}
        image={user.image}
        createdAt={user.createdAt}
      />

      <ProfileStats
        items={itemCounts.total}
        collections={collections.length}
        types={itemTypes}
        itemCounts={itemCounts.byType}
      />

      {user.hasPassword ? (
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
      ) : null}

      <Card className="ring-destructive/30">
        <CardHeader>
          <CardTitle>Delete account</CardTitle>
          <CardDescription>Permanently remove your account and everything in it.</CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteAccountDialog />
        </CardContent>
      </Card>
    </>
  );
};
