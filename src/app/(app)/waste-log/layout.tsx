import { RoleRouteGate } from "@/domains/auth/presentation/components/role-route-gate";

export default function WasteLogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleRouteGate route="/waste-log" allowedRoles={["admin", "grill_master"]}>
      {children}
    </RoleRouteGate>
  );
}
