"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { useSidebar } from "@/components/ui/sidebar";

/**
 * Closes the mobile sidebar drawer once a link in it has navigated, so the
 * new page isn't left behind the overlay. Lives in the layout rather than the
 * drawer, which unmounts while closed and couldn't see the path change.
 * Renders nothing; the desktop sidebar's open state is left alone.
 */
export const CloseSidebarOnNavigate = () => {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  useEffect(() => {
    setOpenMobile(false);
  }, [pathname, setOpenMobile]);

  return null;
};
