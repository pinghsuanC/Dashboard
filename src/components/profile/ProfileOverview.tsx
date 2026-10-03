"use client";

import type { ReactNode } from "react";

import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileStats } from "@/components/profile/ProfileStats";
import { useUserSession } from "@/components/session/UserSessionProvider";

interface ProfileOverviewProps {
  /**
   * Built by the server page and passed in as a slot. Importing the form here
   * would turn it into client code; a slot keeps it server-rendered. Shown
   * only to users with a password, which the session knows.
   */
  passwordCard: ReactNode;
}

/** The session-backed part of the profile page: no query on navigation. */
export const ProfileOverview = ({ passwordCard }: ProfileOverviewProps) => {
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

      {user.hasPassword ? passwordCard : null}
    </>
  );
};
