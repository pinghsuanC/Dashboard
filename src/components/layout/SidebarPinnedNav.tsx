"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { ROUTES } from "@/lib/constants/routes";

/**
 * The link to `/pinned`, above Types, styled like "See all favorites" but
 * text only. With no icon it has nothing to show in the collapsed rail, so
 * it hides there.
 */
export const SidebarPinnedNav = () => {
  const pathname = usePathname();

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            isActive={pathname === ROUTES.pinned}
            className="text-sidebar-foreground/70"
          >
            <Link href={ROUTES.pinned}>
              <span>See all pinned</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
};
