"use client";

import { type CSSProperties, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, ChevronDown, Folder, Star } from "lucide-react";

import { useUserSession } from "@/components/session/UserSessionProvider";
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
import { collectionHref, ROUTES } from "@/lib/constants/routes";
import { selectSidebarCollections } from "@/lib/session/session-selectors";

/** Derived from the session, so a local collection change shows at once. */
export const SidebarCollectionNav = () => {
  const pathname = usePathname();
  const { collections } = useUserSession();
  const { favorites, recents } = useMemo(
    () => selectSidebarCollections(collections),
    [collections],
  );

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
            {favorites.length > 0 && (
              <>
                <p className="text-sidebar-foreground/50 px-2 py-1 text-xs font-medium tracking-wider uppercase group-data-[collapsible=icon]:hidden">
                  Favorites
                </p>
                <SidebarMenu>
                  {favorites.map((collection) => (
                    <SidebarMenuItem key={collection.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === collectionHref(collection.slug)}
                        tooltip={collection.name}
                      >
                        <Link href={collectionHref(collection.slug)}>
                          <Folder />
                          {/* The trailing star, not this span, is the
                              button's last child, so shadcn's last-span
                              truncation misses it; truncate here instead. */}
                          <span className="truncate">{collection.name}</span>
                          <Star className="ml-auto fill-amber-400 text-amber-400" />
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </>
            )}

            {/* Known issue: pt-4 spaces this from the Favorites list, so with
                no favourites it sits 16px lower than it should. */}
            {recents.length > 0 && (
              <p className="text-sidebar-foreground/50 px-2 pt-4 pb-1 text-xs font-medium tracking-wider uppercase group-data-[collapsible=icon]:hidden">
                Recent
              </p>
            )}
            <SidebarMenu>
              {recents.map((collection) => (
                <SidebarMenuItem key={collection.id}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === collectionHref(collection.slug)}
                    tooltip={collection.name}
                    // Room for the dot + count badge, which overlays the row.
                    className="pr-10"
                  >
                    <Link href={collectionHref(collection.slug)}>
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
                  isActive={pathname === ROUTES.collections}
                  tooltip="View all collections"
                  className="text-sidebar-foreground/70"
                >
                  <Link href={ROUTES.collections}>
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
