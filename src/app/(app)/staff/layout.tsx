import { RoleRouteGate } from "@/domains/auth/presentation/components/role-route-gate";

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleRouteGate route="/staff" allowedRoles={["admin"]}>
      {children}
    </RoleRouteGate>
  );
}
