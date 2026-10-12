"use client";

import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileStats } from "@/components/profile/ProfileStats";
import { useUserSession } from "@/components/session/UserSessionProvider";

/** The session-backed part of the profile page: no query on navigation. */
export const ProfileOverview = () => {
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
    </>
  );
};
