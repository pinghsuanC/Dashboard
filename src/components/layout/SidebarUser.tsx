"use client";

import Link from "next/link";
import { Settings } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useCurrentUser } from "@/components/auth/UserProvider";

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export const SidebarUser = () => {
  const user = useCurrentUser();
  // GitHub profiles may have no display name; fall back to the email.
  const displayName = user.name ?? user.email;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" tooltip={displayName} asChild>
          <Link href="/profile">
            <Avatar className="size-8 rounded-full">
              {user.image ? (
                <AvatarImage src={user.image} alt={displayName} />
              ) : null}
              <AvatarFallback className="rounded-full text-xs">
                {initials(displayName)}
              </AvatarFallback>
            </Avatar>
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
          <Link href="/settings" aria-label="Settings">
            <Settings />
          </Link>
        </SidebarMenuAction>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};
