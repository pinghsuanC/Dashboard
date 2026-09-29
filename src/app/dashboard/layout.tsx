import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { UserProvider } from "@/components/auth/UserProvider";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { TopBar } from "@/components/layout/TopBar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getCurrentUser } from "@/lib/db/current-user";

const DashboardLayout = async ({ children }: LayoutProps<"/dashboard">) => {
  // SidebarProvider persists its open state in this cookie. Reading it on the
  // server means the sidebar renders in the right state instead of flashing
  // open and snapping shut after hydration.
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  // The proxy already turns away requests without a valid JWT. This catches a
  // valid token whose user row is gone (e.g. deleted from the DB).
  const user = await getCurrentUser();
  if (!user) redirect("/api/auth/signin?callbackUrl=/dashboard");

  return (
    <UserProvider user={user}>
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
    </UserProvider>
  );
};

export default DashboardLayout;
