"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

import { signInHref } from "@/lib/auth-redirect";

interface SignInToastProps {
  /** Also the toast id, so Strict Mode's double effect shows one toast. */
  id: string;
  title: string;
  description: string;
  callbackUrl: string;
}

/**
 * Rendered by the sign-in page only when an action redirected there with a
 * one-shot flag (`?registered=1`, `?reset=1`). Shows the toast, then replaces
 * the URL without the flag so a refresh or Back doesn't show it again.
 */
export const SignInToast = ({ id, title, description, callbackUrl }: SignInToastProps) => {
  const router = useRouter();

  useEffect(() => {
    toast.success(title, { id, description });
    router.replace(signInHref(callbackUrl), { scroll: false });
  }, [id, title, description, callbackUrl, router]);

  return null;
};
