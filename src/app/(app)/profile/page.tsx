import type { Metadata } from "next";

import { ProfileOverview } from "@/components/profile/ProfileOverview";
import { SignOutButton } from "@/components/profile/SignOutButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_NAME } from "@/lib/constants/app";

export const metadata: Metadata = { title: "Profile" };

/**
 * Queries nothing: user info, item types and counts come from the user
 * session the `(app)` layout loaded. Password and account deletion live on
 * the settings page.
 */
const ProfilePage = () => (
  <div className="mx-auto flex max-w-3xl flex-col gap-6">
    <header>
      <h1 className="font-heading text-3xl font-semibold tracking-tight">Profile</h1>
      <p className="text-muted-foreground mt-1">Your account and how you use {APP_NAME}</p>
    </header>

    <ProfileOverview />

    <Card>
      <CardHeader>
        <CardTitle>Sign out</CardTitle>
        <CardDescription>End your session on this device.</CardDescription>
      </CardHeader>
      <CardContent>
        <SignOutButton />
      </CardContent>
    </Card>
  </div>
);

export default ProfilePage;
