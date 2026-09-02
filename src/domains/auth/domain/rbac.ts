import type { SessionProfile, UserRole } from "./entities";

export type AppRoute =
  | "/dashboard"
  | "/inventory"
  | "/orders"
  | "/waste"
  | "/kitchen"
  | "/staff";

export const APP_NAV_ROUTES = [
  "/dashboard",
  "/inventory",
  "/orders",
  "/waste",
  "/kitchen",
] as const;

export type NavAppRoute = (typeof APP_NAV_ROUTES)[number];

export const PROTECTED_APP_ROUTES: readonly AppRoute[] = [
  ...APP_NAV_ROUTES,
  "/staff",
] as const;

const ROLE_ROUTE_ACCESS: Record<UserRole, Record<AppRoute, boolean>> = {
  admin: {
    "/dashboard": true,
    "/inventory": true,
    "/orders": true,
    "/waste": true,
    "/kitchen": true,
    "/staff": true,
  },
  grill_master: {
    "/dashboard": false,
    "/inventory": true,
    "/orders": true,
    "/waste": true,
    "/kitchen": true,
    "/staff": false,
  },
  waiter: {
    "/dashboard": false,
    "/inventory": false,
    "/orders": true,
    "/waste": false,
    "/kitchen": false,
    "/staff": false,
  },
};

const ROLE_DENIED_REDIRECT: Record<UserRole, AppRoute> = {
  admin: "/dashboard",
  grill_master: "/kitchen",
  waiter: "/orders",
};

function resolveAppRoute(pathname: string): AppRoute | null {
  for (const route of PROTECTED_APP_ROUTES) {
    if (pathname === route || pathname.startsWith(`${route}/`)) {
      return route;
    }
  }
  return null;
}

export function getDefaultLandingRoute(role: UserRole): AppRoute {
  switch (role) {
    case "admin":
      return "/dashboard";
    case "grill_master":
      return "/kitchen";
    case "waiter":
      return "/orders";
  }
}

export type PublicEntryPath = "/login" | "/onboarding" | AppRoute;

export function resolveAuthenticatedEntryPath(
  profile: SessionProfile | null,
): PublicEntryPath {
  if (!profile) {
    return "/login";
  }

  if (!profile.isOnboarded || !profile.role) {
    return "/onboarding";
  }

  return getDefaultLandingRoute(profile.role);
}

export function isRouteAllowed(role: UserRole, pathname: string): boolean {
  const route = resolveAppRoute(pathname);
  if (!route) {
    return false;
  }
  return ROLE_ROUTE_ACCESS[role][route];
}

export function resolveRoleRedirect(
  role: UserRole,
  pathname: string,
): AppRoute | null {
  if (isRouteAllowed(role, pathname)) {
    return null;
  }
  return ROLE_DENIED_REDIRECT[role];
}

export function getNavRoutesForRole(role: UserRole): NavAppRoute[] {
  return APP_NAV_ROUTES.filter((route) => ROLE_ROUTE_ACCESS[role][route]);
}
