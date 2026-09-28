"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";

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
import { getItemTypeIcon } from "@/lib/item-type-icons";
import type { SidebarItemType } from "@/lib/db/items";

/**
 * Types that need a Pro subscription. Pro is a per-user flag that will come
 * from the session; until then the badge shows for every user.
 */
const PRO_TYPE_NAMES = new Set(["file", "image"]);

interface SidebarTypeNavProps {
  types: SidebarItemType[];
}

/**
 * Client component only because the active row depends on the current URL.
 * The data itself is passed down from the server component that owns it.
 */
export const SidebarTypeNav = ({ types }: SidebarTypeNavProps) => {
  const pathname = usePathname();

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
              {types.map((type) => {
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
                        {PRO_TYPE_NAMES.has(type.name) && (
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
                    <SidebarMenuBadge>{type.itemCount}</SidebarMenuBadge>
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
