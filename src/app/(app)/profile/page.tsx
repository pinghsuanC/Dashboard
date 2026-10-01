import type { Metadata } from "next";
import { connection } from "next/server";

import { ChangePasswordForm } from "@/components/profile/ChangePasswordForm";
import { DeleteAccountDialog } from "@/components/profile/DeleteAccountDialog";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileStats } from "@/components/profile/ProfileStats";
import { FlagToast } from "@/components/shared/FlagToast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { firstParam } from "@/lib/auth-redirect";
import { getCollectionStats } from "@/lib/db/collections";
import { requireCurrentUser } from "@/lib/db/current-user";
import { getItemStats, getSystemItemTypes } from "@/lib/db/items";
import { getProfileDetails } from "@/lib/db/profile";

export const metadata: Metadata = { title: "Profile | DevStash" };

/**
 * Server component: everything is fetched here and handed to the children as
 * props. The sidebar and top bar come from the `(app)` layout.
 */
const ProfilePage = async ({ searchParams }: PageProps<"/profile">) => {
  await connection();

  const [user, details, itemStats, collectionStats, types, params] = await Promise.all([
    requireCurrentUser(),
    getProfileDetails(),
    getItemStats(),
    getCollectionStats(),
    getSystemItemTypes(),
    searchParams,
  ]);
  const passwordChanged = firstParam(params.password) === "changed";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      {passwordChanged ? (
        <FlagToast id="password-changed" title="Password updated" href="/profile" />
      ) : null}

      <header>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Profile</h1>
        <p className="text-muted-foreground mt-1">Your account and how you use DevStash</p>
      </header>

      <ProfileHeader
        name={user.name}
        email={user.email}
        image={user.image}
        createdAt={details.createdAt}
      />

      <ProfileStats
        items={itemStats.items}
        collections={collectionStats.collections}
        types={types}
      />

      {details.hasPassword ? (
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
          <CardDescription>
            Permanently remove your account and everything in it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteAccountDialog />
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfilePage;
