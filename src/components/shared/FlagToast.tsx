"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

interface FlagToastProps {
  /** Also the toast id, so Strict Mode's double effect shows one toast. */
  id: string;
  title: string;
  description?: string;
  /** The current page's URL without the flag. */
  href: string;
}

/**
 * Rendered by a page only when an action redirected there with a one-shot
 * flag (`?registered=1`, `?password=changed`). Shows the toast, then replaces
 * the URL without the flag so a refresh or Back doesn't show it again.
 */
export const FlagToast = ({ id, title, description, href }: FlagToastProps) => {
  const router = useRouter();

  useEffect(() => {
    toast.success(title, { id, description });
    router.replace(href, { scroll: false });
  }, [id, title, description, href, router]);

  return null;
};
