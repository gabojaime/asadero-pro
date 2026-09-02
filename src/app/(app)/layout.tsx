import { Suspense } from "react";
import { AppShellSkeleton } from "@/domains/auth/presentation/components/app-shell-skeleton";
import { ProtectedAppShell } from "@/domains/auth/presentation/components/protected-app-shell";

export const instant = false;

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<AppShellSkeleton />}>
      <ProtectedAppShell>{children}</ProtectedAppShell>
    </Suspense>
  );
}
