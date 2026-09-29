import Link from "next/link";
import { Layers } from "lucide-react";

import { SidebarCollectionNav } from "@/components/layout/SidebarCollectionNav";
import { SidebarTypeNav } from "@/components/layout/SidebarTypeNav";
import { SidebarUser } from "@/components/layout/SidebarUser";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { getSidebarCollections } from "@/lib/db/collections";
import { getSystemItemTypes } from "@/lib/db/items";

/**
 * Server component: types and collections are queried here and only the
 * slices the nav renders cross the client boundary.
 * The user footer reads the signed-in profile from `UserProvider`.
 */
export const AppSidebar = async () => {
  const [types, { favorites, recents }] = await Promise.all([
    getSystemItemTypes(),
    getSidebarCollections(),
  ]);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip="DevStash">
              <Link href="/dashboard">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Layers />
                </div>
                <span className="font-heading text-base font-semibold">
                  DevStash
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarTypeNav types={types} />
        <SidebarSeparator />
        <SidebarCollectionNav favorites={favorites} recents={recents} />
      </SidebarContent>

      <SidebarFooter>
        <SidebarUser />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
};
