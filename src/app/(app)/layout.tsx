import { cookies } from "next/headers";

import { ItemDrawerProvider } from "@/components/items/ItemDrawerProvider";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { CloseSidebarOnNavigate } from "@/components/layout/CloseSidebarOnNavigate";
import { TopBar } from "@/components/layout/TopBar";
import { UserSessionProvider } from "@/components/session/UserSessionProvider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getUserSession } from "@/lib/session/user-session";

const AppLayout = async ({ children }: LayoutProps<"/">) => {
  // SidebarProvider persists its open state in this cookie. Reading it on the
  // server means the sidebar renders in the right state instead of flashing
  // open and snapping shut after hydration.
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  // The one place the user session is loaded. This layout runs on a full page
  // load (e.g. right after sign-in) and on a reset, not on navigation, and
  // the provider keeps the session for every page below; pages read it with
  // `useUserSession()` instead of querying. The proxy already turns away
  // requests without a valid JWT; the session load redirects a valid token
  // whose user row is gone (e.g. deleted from the DB).
  const session = await getUserSession();

  return (
    <UserSessionProvider session={session}>
      <TooltipProvider>
        {/* Above the sidebar and top bar, not just the page, so anything in
            the shell (e.g. search results) can open the item drawer too. */}
        <ItemDrawerProvider>
          <SidebarProvider defaultOpen={defaultOpen}>
            <AppSidebar />
            <CloseSidebarOnNavigate />

            <SidebarInset>
              <TopBar />
              {/* A plain div, not <main>: SidebarInset already renders <main>, and
                  nesting a second one is invalid HTML and a duplicate landmark. */}
              <div className="flex-1 p-6">{children}</div>
            </SidebarInset>
          </SidebarProvider>
        </ItemDrawerProvider>
      </TooltipProvider>
    </UserSessionProvider>
  );
};

export default AppLayout;
