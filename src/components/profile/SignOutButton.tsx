"use client";

import { useFormStatus } from "react-dom";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { signOutAndClearCache } from "@/lib/auth/sign-out-and-clear-cache";

/** A leaf so it can read the form's pending state while the sign-out runs. */
const SignOutSubmit = () => {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="outline" disabled={pending}>
      <LogOut />
      {pending ? "Signing out…" : "Sign out"}
    </Button>
  );
};

/**
 * Client code because `signOutAndClearCache` runs in the browser: the server
 * action clears the cookie, then a full load of the signed-out route lets its
 * `Clear-Site-Data` reach the browser.
 */
export const SignOutButton = () => (
  <form action={signOutAndClearCache}>
    <SignOutSubmit />
  </form>
);
