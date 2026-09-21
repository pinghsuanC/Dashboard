import { cookies } from "next/headers";

import { AppSidebar } from "@/components/layout/AppSidebar";
import { TopBar } from "@/components/layout/TopBar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

const DashboardLayout = async ({ children }: LayoutProps<"/dashboard">) => {
  // SidebarProvider persists its open state in this cookie. Reading it on the
  // server means the sidebar renders in the right state instead of flashing
  // open and snapping shut after hydration.
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar />

        <SidebarInset>
          <TopBar />
          {/* A plain div, not <main>: SidebarInset already renders <main>, and
              nesting a second one is invalid HTML and a duplicate landmark. */}
          <div className="flex-1 p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
};

export default DashboardLayout;
