import { TopBar } from "@/components/layout/TopBar";

export default function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  return (
    <div className="flex min-h-svh w-full">
      {/* Placeholder — the real sidebar lands in phase 2. */}
      <aside className="bg-sidebar hidden w-64 shrink-0 border-r p-4 md:block">
        <h2 className="text-lg font-semibold">Sidebar</h2>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
