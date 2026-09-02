import { RoleRouteGate } from "@/domains/auth/presentation/components/role-route-gate";

export default function OrdersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleRouteGate
      route="/orders"
      allowedRoles={["admin", "grill_master", "waiter"]}
    >
      {children}
    </RoleRouteGate>
  );
}
