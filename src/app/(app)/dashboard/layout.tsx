import { RoleRouteGate } from "@/domains/auth/presentation/components/role-route-gate";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleRouteGate route="/dashboard" allowedRoles={["admin"]}>
      {children}
    </RoleRouteGate>
  );
}
