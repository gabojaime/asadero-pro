import { RoleRouteGate } from "@/domains/auth/presentation/components/role-route-gate";

export default function MenuLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleRouteGate route="/menu" allowedRoles={["admin"]}>
      {children}
    </RoleRouteGate>
  );
}
