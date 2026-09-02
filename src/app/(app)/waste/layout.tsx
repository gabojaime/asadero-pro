import { RoleRouteGate } from "@/domains/auth/presentation/components/role-route-gate";

export default function WasteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleRouteGate route="/waste" allowedRoles={["admin", "grill_master"]}>
      {children}
    </RoleRouteGate>
  );
}
