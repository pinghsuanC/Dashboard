import type { Metadata } from "next";

import { ProfileOverview } from "@/components/profile/ProfileOverview";
import { FlagToast } from "@/components/shared/FlagToast";
import { firstParam } from "@/lib/auth-redirect";

export const metadata: Metadata = { title: "Profile | DevStash" };

/**
 * Queries nothing: user info, item types and counts come from the user
 * session the `(app)` layout loaded. Only the one-shot toast flag is read
 * here, from the URL.
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

      <ProfileOverview passwordChanged={passwordChanged} />
    </div>
  );
};

export default ProfilePage;
