"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { UserRole } from "@/domains/auth/domain/entities";
import {
  getDefaultLandingRoute,
  resolveRoleRedirect,
  type AppRoute,
} from "@/domains/auth/domain/rbac";
import { useSession } from "@/domains/auth/presentation/providers/session-provider";

type RoleRouteGateProps = {
  route: AppRoute;
  allowedRoles: UserRole[];
  children: React.ReactNode;
};

export function RoleRouteGate({
  route,
  allowedRoles,
  children,
}: RoleRouteGateProps) {
  const router = useRouter();
  const { role } = useSession();

  const rbacRedirect = resolveRoleRedirect(role, route);
  const isAllowed = allowedRoles.includes(role);

  useEffect(() => {
    if (rbacRedirect) {
      router.replace(rbacRedirect);
      return;
    }

    if (!isAllowed) {
      router.replace(getDefaultLandingRoute(role));
    }
  }, [isAllowed, rbacRedirect, role, router]);

  if (rbacRedirect || !isAllowed) {
    return null;
  }

  return children;
}
