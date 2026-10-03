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
import { APP_NAME } from "@/lib/constants/app";
import { ROUTES } from "@/lib/constants/routes";

/**
 * Server component for the static frame only. The type nav, collection nav
 * and user footer read the user session themselves, so this queries nothing.
 */
export const AppSidebar = () => {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip={APP_NAME}>
              <Link href={ROUTES.dashboard}>
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Layers />
                </div>
                <span className="font-heading text-base font-semibold">
                  {APP_NAME}
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarTypeNav />
        <SidebarSeparator />
        <SidebarCollectionNav />
      </SidebarContent>

      <SidebarFooter>
        <SidebarUser />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
};
