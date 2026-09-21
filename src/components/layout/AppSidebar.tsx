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
import { MOCK_COLLECTIONS, MOCK_ITEM_TYPES, MOCK_USER } from "@/lib/mock-data";

/**
 * Server component: the mock arrays are read here and only the slices the nav
 * actually renders cross the client boundary, so MOCK_ITEMS never ships to the
 * browser. Swapping these imports for Prisma queries is a drop-in change.
 */
export const AppSidebar = () => {
  const favorites = MOCK_COLLECTIONS.filter((c) => c.isFavorite);
  const others = MOCK_COLLECTIONS.filter((c) => !c.isFavorite);

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
        <SidebarTypeNav types={MOCK_ITEM_TYPES} />
        <SidebarSeparator />
        <SidebarCollectionNav favorites={favorites} others={others} />
      </SidebarContent>

      <SidebarFooter>
        <SidebarUser user={MOCK_USER} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
};
