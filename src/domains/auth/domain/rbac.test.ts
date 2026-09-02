import { describe, expect, it } from "vitest";
import type { SessionProfile } from "./entities";
import {
  APP_NAV_ROUTES,
  getDefaultLandingRoute,
  getNavRoutesForRole,
  isRouteAllowed,
  resolveAuthenticatedEntryPath,
  resolveRoleRedirect,
} from "./rbac";

describe("getDefaultLandingRoute", () => {
  it("returns role-specific default routes", () => {
    expect(getDefaultLandingRoute("admin")).toBe("/dashboard");
    expect(getDefaultLandingRoute("grill_master")).toBe("/kitchen");
    expect(getDefaultLandingRoute("waiter")).toBe("/orders");
  });
});

describe("resolveAuthenticatedEntryPath", () => {
  const onboardedAdmin: SessionProfile = {
    userId: "user-1",
    email: "admin@test.com",
    merchantId: "merchant-1",
    merchantName: "Test",
    fullName: "Admin",
    role: "admin",
    isOnboarded: true,
  };

  it("returns login when there is no session profile", () => {
    expect(resolveAuthenticatedEntryPath(null)).toBe("/login");
  });

  it("returns onboarding when profile is incomplete", () => {
    expect(
      resolveAuthenticatedEntryPath({
        ...onboardedAdmin,
        isOnboarded: false,
        role: null,
      }),
    ).toBe("/onboarding");
  });

  it("returns role landing when profile is complete", () => {
    expect(resolveAuthenticatedEntryPath(onboardedAdmin)).toBe("/dashboard");
    expect(
      resolveAuthenticatedEntryPath({ ...onboardedAdmin, role: "grill_master" }),
    ).toBe("/kitchen");
    expect(
      resolveAuthenticatedEntryPath({ ...onboardedAdmin, role: "waiter" }),
    ).toBe("/orders");
  });
});

describe("isRouteAllowed", () => {
  const routes = APP_NAV_ROUTES;

  it("allows admin on all MVP routes and staff", () => {
    for (const route of routes) {
      expect(isRouteAllowed("admin", route)).toBe(true);
      expect(isRouteAllowed("admin", `${route}/detail`)).toBe(true);
    }
    expect(isRouteAllowed("admin", "/staff")).toBe(true);
  });

  it("denies grill_master and waiter on staff", () => {
    expect(isRouteAllowed("grill_master", "/staff")).toBe(false);
    expect(isRouteAllowed("waiter", "/staff")).toBe(false);
  });

  it("allows grill_master on inventory, orders, waste, kitchen only", () => {
    expect(isRouteAllowed("grill_master", "/dashboard")).toBe(false);
    expect(isRouteAllowed("grill_master", "/inventory")).toBe(true);
    expect(isRouteAllowed("grill_master", "/orders")).toBe(true);
    expect(isRouteAllowed("grill_master", "/orders/uuid-123")).toBe(true);
    expect(isRouteAllowed("grill_master", "/waste")).toBe(true);
    expect(isRouteAllowed("grill_master", "/kitchen")).toBe(true);
  });

  it("allows waiter only on orders", () => {
    expect(isRouteAllowed("waiter", "/orders")).toBe(true);
    expect(isRouteAllowed("waiter", "/orders/uuid-123")).toBe(true);
    expect(isRouteAllowed("waiter", "/dashboard")).toBe(false);
    expect(isRouteAllowed("waiter", "/inventory")).toBe(false);
    expect(isRouteAllowed("waiter", "/waste")).toBe(false);
    expect(isRouteAllowed("waiter", "/kitchen")).toBe(false);
  });
});

describe("resolveRoleRedirect", () => {
  it("returns null when route is allowed", () => {
    expect(resolveRoleRedirect("admin", "/dashboard")).toBeNull();
    expect(resolveRoleRedirect("grill_master", "/kitchen")).toBeNull();
    expect(resolveRoleRedirect("waiter", "/orders")).toBeNull();
  });

  it("redirects grill_master from dashboard and staff to kitchen", () => {
    expect(resolveRoleRedirect("grill_master", "/dashboard")).toBe("/kitchen");
    expect(resolveRoleRedirect("grill_master", "/staff")).toBe("/kitchen");
  });

  it("redirects waiter from blocked routes to orders", () => {
    expect(resolveRoleRedirect("waiter", "/dashboard")).toBe("/orders");
    expect(resolveRoleRedirect("waiter", "/inventory")).toBe("/orders");
    expect(resolveRoleRedirect("waiter", "/waste")).toBe("/orders");
    expect(resolveRoleRedirect("waiter", "/kitchen")).toBe("/orders");
    expect(resolveRoleRedirect("waiter", "/staff")).toBe("/orders");
  });

  it("redirects unknown paths to role default", () => {
    expect(resolveRoleRedirect("waiter", "/unknown")).toBe("/orders");
    expect(resolveRoleRedirect("grill_master", "/unknown")).toBe("/kitchen");
  });
});

describe("getNavRoutesForRole", () => {
  it("returns all nav routes for admin (staff is sidebar-only, not in nav helper)", () => {
    expect(getNavRoutesForRole("admin")).toEqual([
      "/dashboard",
      "/inventory",
      "/orders",
      "/waste",
      "/kitchen",
    ]);
    expect(getNavRoutesForRole("admin")).not.toContain("/staff");
  });

  it("excludes dashboard for grill_master", () => {
    expect(getNavRoutesForRole("grill_master")).toEqual([
      "/inventory",
      "/orders",
      "/waste",
      "/kitchen",
    ]);
  });

  it("returns orders only for waiter", () => {
    expect(getNavRoutesForRole("waiter")).toEqual(["/orders"]);
  });
});
