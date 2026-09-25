"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";

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
                        <span>{type.label}</span>
                      </Link>
                    </SidebarMenuButton>
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
