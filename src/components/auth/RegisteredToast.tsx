"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

import { signInHref } from "@/lib/auth-redirect";

interface RegisteredToastProps {
  callbackUrl: string;
}

/**
 * Rendered by the sign-in page only when the register action redirected
 * there with `?registered=1`. Shows the toast, then replaces the URL without
 * the flag so a refresh or Back doesn't show it again. The fixed toast id
 * keeps Strict Mode's double effect down to one toast.
 */
export const RegisteredToast = ({ callbackUrl }: RegisteredToastProps) => {
  const router = useRouter();

  useEffect(() => {
    toast.success("Account created", {
      id: "registered",
      description: "Check your email for a link to verify your account, then sign in.",
    });
    router.replace(signInHref(callbackUrl), { scroll: false });
  }, [callbackUrl, router]);

  return null;
};
