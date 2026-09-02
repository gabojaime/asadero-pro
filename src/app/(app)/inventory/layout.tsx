import { RoleRouteGate } from "@/domains/auth/presentation/components/role-route-gate";

export default function InventoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleRouteGate route="/inventory" allowedRoles={["admin", "grill_master"]}>
      {children}
    </RoleRouteGate>
  );
}
