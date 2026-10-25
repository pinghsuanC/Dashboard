"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";

import { useUserSession } from "@/components/session/UserSessionProvider";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { canUseType } from "@/lib/billing/plan-rules";
import { getItemTypeIcon } from "@/lib/items/item-type-icons";

/**
 * Client component: the active row depends on the current URL, and the types
 * and counts come from the user session, so a local count change shows with
 * no request. The PRO badge marks the types the user's plan can't create, as
 * the New Item dialog does, so a Pro user sees none.
 */
export const SidebarTypeNav = () => {
  const pathname = usePathname();
  const { user, itemTypes, itemCounts } = useUserSession();

  return (
    <Collapsible defaultOpen className="group/types">
      <SidebarGroup>
        <SidebarGroupLabel asChild className="text-sm">
          <CollapsibleTrigger>
            Types
            <ChevronDown className="ml-auto transition-transform group-data-[state=closed]/types:-rotate-90" />
          </CollapsibleTrigger>
        </SidebarGroupLabel>

        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu>
              {itemTypes.map((type) => {
                const Icon = getItemTypeIcon(type.icon ?? "");

                return (
                  <SidebarMenuItem key={type.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === type.route}
                      tooltip={type.label}
                    >
                      <Link href={type.route}>
                        {/* Type colours are user-definable data, so the hex
                            arrives as a CSS variable and Tailwind applies it. */}
                        <Icon
                          className="text-(--type-color)"
                          style={
                            { "--type-color": type.color } as CSSProperties
                          }
                        />
                        {/* The button only truncates its last span, which is
                            now the badge, so the label truncates itself. */}
                        <span className="truncate">{type.label}</span>
                        {!canUseType(user.plan, type.name) && (
                          <Badge
                            variant="outline"
                            className="h-4 px-1.5 text-[10px] font-semibold tracking-wide text-muted-foreground group-data-[collapsible=icon]:hidden"
                          >
                            PRO
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                    {/* Known issue: the count is absolutely positioned and the
                        button reserves no room for it, so a long label (or
                        label + PRO) runs underneath. Fine for the current
                        labels; add `pr-8` to the button if custom types land. */}
                    <SidebarMenuBadge>{itemCounts.byType[type.id] ?? 0}</SidebarMenuBadge>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
};
