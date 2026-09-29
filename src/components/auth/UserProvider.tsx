"use client";

import { createContext, useContext } from "react";

import type { CurrentUser } from "@/lib/db/current-user";

const UserContext = createContext<CurrentUser | null>(null);

interface UserProviderProps {
  user: CurrentUser;
  children: React.ReactNode;
}

/**
 * Makes the signed-in user's profile available to client components. The
 * server layout fetches it with `getCurrentUser()` and seeds it here, so there
 * is no client-side fetch and no loading state.
 */
export const UserProvider = ({ user, children }: UserProviderProps) => {
  return <UserContext value={user}>{children}</UserContext>;
};

export const useCurrentUser = (): CurrentUser => {
  const user = useContext(UserContext);
  if (!user) {
    throw new Error("useCurrentUser must be used inside <UserProvider>.");
  }
  return user;
};
