"use client";

import type { ReactNode } from "react";

import { useUserSession } from "@/components/session/UserSessionProvider";

interface PasswordSectionProps {
  /**
   * Built by the server page and passed in as children. Importing the form
   * here would turn it into client code; a slot keeps it server-rendered.
   */
  children: ReactNode;
}

/** Shows the change-password card only to users with a password, which the session knows. */
export const PasswordSection = ({ children }: PasswordSectionProps) => {
  const { user } = useUserSession();

  return user.hasPassword ? children : null;
};
