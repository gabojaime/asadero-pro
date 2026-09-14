import { RoleRouteGate } from "@/domains/auth/presentation/components/role-route-gate";

export default function WasteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleRouteGate route="/waste" allowedRoles={["admin"]}>
      {children}
    </RoleRouteGate>
  );
}
