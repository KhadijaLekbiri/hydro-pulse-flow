import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { SimControls } from "./SimControls";

export default function AppLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-surface">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b bg-card/60 backdrop-blur px-4 sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <h1 className="text-sm font-semibold text-foreground">
                Smart Water Network · Neighborhood Twin
              </h1>
            </div>
            <SimControls />
          </header>
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
