"use client";

import Link from "next/link";
import { CreditCard, Settings } from "lucide-react";

import { useUserSession } from "@/components/session/UserSessionProvider";
import { UserAvatar } from "@/components/shared/UserAvatar";
import {
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { ROUTES } from "@/lib/constants/routes";

/**
 * Client component reading the user session, so a local profile change (or a
 * `resetProfile()`) shows here without a reload. Sign-out lives on the
 * profile page this links to; the plan and past subscriptions on the billing page.
 */
export const SidebarUser = () => {
  const { user } = useUserSession();

  // GitHub profiles may have no display name; fall back to the email.
  const displayName = user.name ?? user.email;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" tooltip={displayName} asChild>
          <Link href={ROUTES.profile}>
            <UserAvatar name={user.name} email={user.email} image={user.image} />
            <div className="grid flex-1 text-left leading-tight">
              <span className="truncate text-sm font-medium">
                {displayName}
              </span>
              <span className="text-sidebar-foreground/60 truncate text-xs">
                {user.email}
              </span>
            </div>
          </Link>
        </SidebarMenuButton>

        {/* A menu action, not a free-floating link: its presence makes the
            button reserve pr-8, so a long name or email truncates before the
            gear. `top-1/2!` beats the action's own size-lg top offset. */}
        <SidebarMenuAction
          asChild
          className="text-sidebar-foreground/60 size-7 top-1/2! -translate-y-1/2"
        >
          <Link href={ROUTES.settings} aria-label="Settings">
            <Settings />
          </Link>
        </SidebarMenuAction>
      </SidebarMenuItem>

      <SidebarMenuItem>
        <SidebarMenuButton tooltip="Billing" asChild>
          <Link href={ROUTES.billings}>
            <CreditCard />
            <span>Billing</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};
