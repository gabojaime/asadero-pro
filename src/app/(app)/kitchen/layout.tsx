import { RoleRouteGate } from "@/domains/auth/presentation/components/role-route-gate";

export default function KitchenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleRouteGate route="/kitchen" allowedRoles={["admin", "grill_master"]}>
      {children}
    </RoleRouteGate>
  );
}
