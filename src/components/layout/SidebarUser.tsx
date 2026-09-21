import Link from "next/link";
import { Settings } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { User } from "@/lib/mock-data";

interface SidebarUserProps {
  user: User;
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function SidebarUser({ user }: SidebarUserProps) {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" tooltip={user.name} asChild>
          <Link href="/profile">
            <Avatar className="size-8 rounded-full">
              {user.image ? (
                <AvatarImage src={user.image} alt={user.name} />
              ) : null}
              <AvatarFallback className="rounded-full text-xs">
                {initials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left leading-tight">
              <span className="truncate text-sm font-medium">{user.name}</span>
              <span className="text-sidebar-foreground/60 truncate text-xs">
                {user.email}
              </span>
            </div>
          </Link>
        </SidebarMenuButton>

        <Link
          href="/settings"
          aria-label="Settings"
          className="text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground absolute top-1/2 right-1 flex size-7 -translate-y-1/2 items-center justify-center rounded-md group-data-[collapsible=icon]:hidden"
        >
          <Settings className="size-4" />
        </Link>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
