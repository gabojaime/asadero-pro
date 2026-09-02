"use client";

import { SidebarTrigger } from "@/shared/presentation/ui/sidebar";

export function AppShellHeader() {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center border-b border-border bg-background px-4 pt-[env(safe-area-inset-top)] md:hidden">
      <SidebarTrigger className="min-h-11 min-w-11" />
      <span className="ml-3 text-sm font-semibold">Asadero Pro</span>
    </header>
  );
}
