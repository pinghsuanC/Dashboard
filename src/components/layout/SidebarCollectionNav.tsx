"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, ChevronDown, Folder, Star } from "lucide-react";

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
import type { SidebarCollection } from "@/lib/db/collections";

interface SidebarCollectionNavProps {
  favorites: SidebarCollection[];
  recents: SidebarCollection[];
}

function collectionHref(collection: SidebarCollection) {
  return `/collections/${collection.slug}`;
}

export const SidebarCollectionNav = ({
  favorites,
  recents,
}: SidebarCollectionNavProps) => {
  const pathname = usePathname();

  return (
    <Collapsible defaultOpen className="group/collections">
      <SidebarGroup>
        <SidebarGroupLabel asChild className="text-sm">
          <CollapsibleTrigger>
            Collections
            <ChevronDown className="ml-auto transition-transform group-data-[state=closed]/collections:-rotate-90" />
          </CollapsibleTrigger>
        </SidebarGroupLabel>

        <CollapsibleContent>
          <SidebarGroupContent>
            <p className="text-sidebar-foreground/50 px-2 py-1 text-xs font-medium tracking-wider uppercase group-data-[collapsible=icon]:hidden">
              Favorites
            </p>
            <SidebarMenu>
              {favorites.map((collection) => (
                <SidebarMenuItem key={collection.id}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === collectionHref(collection)}
                    tooltip={collection.name}
                  >
                    <Link href={collectionHref(collection)}>
                      <Folder />
                      <span>{collection.name}</span>
                      <Star className="ml-auto fill-amber-400 text-amber-400" />
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>

            <p className="text-sidebar-foreground/50 px-2 pt-4 pb-1 text-xs font-medium tracking-wider uppercase group-data-[collapsible=icon]:hidden">
              Recent
            </p>
            <SidebarMenu>
              {recents.map((collection) => (
                <SidebarMenuItem key={collection.id}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === collectionHref(collection)}
                    tooltip={collection.name}
                    // Room for the dot + count badge, which overlays the row.
                    className="pr-10"
                  >
                    <Link href={collectionHref(collection)}>
                      <Folder />
                      <span>{collection.name}</span>
                    </Link>
                  </SidebarMenuButton>
                  <SidebarMenuBadge className="gap-2">
                    {/* Most-used type's colour; empty collections get none. */}
                    {collection.color && (
                      <span
                        aria-hidden
                        className="size-2 rounded-full bg-(--type-color)"
                        style={
                          { "--type-color": collection.color } as CSSProperties
                        }
                      />
                    )}
                    {collection.itemCount}
                  </SidebarMenuBadge>
                </SidebarMenuItem>
              ))}

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/collections"}
                  tooltip="View all collections"
                  className="text-sidebar-foreground/70"
                >
                  <Link href="/collections">
                    <ArrowRight />
                    <span>View all collections</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
};
