import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getServerSessionProfile } from "@/domains/auth/infrastructure/session-profile-server";
import { AppShellHeader } from "@/domains/auth/presentation/components/app-shell-header";
import { AppSidebar } from "@/domains/auth/presentation/components/app-sidebar";
import { SessionProvider } from "@/domains/auth/presentation/providers/session-provider";
import {
  SidebarInset,
  SidebarProvider,
} from "@/shared/presentation/ui/sidebar";

export async function ProtectedAppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();

  const profile = await getServerSessionProfile();

  if (!profile) {
    redirect("/login");
  }

  if (!profile.isOnboarded) {
    redirect("/onboarding");
  }

  return (
    <SessionProvider initialProfile={profile}>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="min-h-svh w-full">
          <AppShellHeader />
          <div className="flex w-full flex-1 flex-col gap-6 p-4 md:p-6">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </SessionProvider>
  );
}
