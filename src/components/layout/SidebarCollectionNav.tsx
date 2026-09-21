"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Folder, Star } from "lucide-react";

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
import type { Collection } from "@/lib/mock-data";

interface SidebarCollectionNavProps {
  favorites: Collection[];
  others: Collection[];
}

function collectionHref(collection: Collection) {
  return `/collections/${collection.slug}`;
}

export function SidebarCollectionNav({
  favorites,
  others,
}: SidebarCollectionNavProps) {
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
              All collections
            </p>
            <SidebarMenu>
              {others.map((collection) => (
                <SidebarMenuItem key={collection.id}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === collectionHref(collection)}
                    tooltip={collection.name}
                  >
                    <Link href={collectionHref(collection)}>
                      <Folder />
                      <span>{collection.name}</span>
                    </Link>
                  </SidebarMenuButton>
                  <SidebarMenuBadge>{collection.itemCount}</SidebarMenuBadge>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}
