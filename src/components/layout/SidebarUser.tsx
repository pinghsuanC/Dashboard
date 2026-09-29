import Link from "next/link";
import { LogOut, Settings } from "lucide-react";

import { signOutAction } from "@/actions/auth";
import { UserAvatar } from "@/components/shared/UserAvatar";
import {
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { getCurrentUser } from "@/lib/db/current-user";

/**
 * Server component. `getCurrentUser()` is cached per request, so this reuses
 * the layout's lookup rather than querying again. The sidebar primitives are
 * client components; they render here as islands with server-built children.
 */
export const SidebarUser = async () => {
  const user = await getCurrentUser();
  // The dashboard layout has already redirected when there is no user.
  if (!user) return null;

  // GitHub profiles may have no display name; fall back to the email.
  const displayName = user.name ?? user.email;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" tooltip={displayName} asChild>
          <Link href="/profile">
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
          <Link href="/settings" aria-label="Settings">
            <Settings />
          </Link>
        </SidebarMenuAction>
      </SidebarMenuItem>

      <SidebarMenuItem>
        {/* A server-action form, so sign-out clears the cookie on the server
            and redirects without any client-side session code. */}
        <form action={signOutAction}>
          <SidebarMenuButton
            type="submit"
            tooltip="Sign out"
            className="text-sidebar-foreground/70"
          >
            <LogOut />
            <span>Sign out</span>
          </SidebarMenuButton>
        </form>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};
