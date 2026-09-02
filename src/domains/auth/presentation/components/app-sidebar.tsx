"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChefHat,
  ClipboardList,
  LayoutDashboard,
  Package,
  Trash2,
  Users,
} from "lucide-react";
import { getNavRoutesForRole, type NavAppRoute } from "@/domains/auth/domain/rbac";
import { ROLE_LABELS } from "@/domains/auth/domain/role-labels";
import { useSession } from "@/domains/auth/presentation/providers/session-provider";
import { useSignOut } from "@/domains/auth/infrastructure/query-adapters";
import { AsaderoLogo } from "@/shared/presentation/asadero-logo";
import { Button } from "@/shared/presentation/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/shared/presentation/ui/sidebar";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  matchPath: string;
};

const ROUTE_META: Record<
  NavAppRoute,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  "/dashboard": { label: "Panel", icon: LayoutDashboard },
  "/inventory": { label: "Inventario", icon: Package },
  "/orders": { label: "Pedidos", icon: ClipboardList },
  "/waste": { label: "Merma", icon: Trash2 },
  "/kitchen": { label: "Cocina", icon: ChefHat },
};

const ADMIN_NAV_ORDER: NavAppRoute[] = [
  "/dashboard",
  "/inventory",
  "/orders",
  "/waste",
  "/kitchen",
];

const GRILL_MASTER_NAV_ORDER: NavAppRoute[] = [
  "/kitchen",
  "/inventory",
  "/orders",
  "/waste",
];

function buildNavItems(role: ReturnType<typeof useSession>["role"]): NavItem[] {
  const allowedRoutes = getNavRoutesForRole(role);
  const order =
    role === "admin"
      ? ADMIN_NAV_ORDER
      : role === "grill_master"
        ? GRILL_MASTER_NAV_ORDER
        : allowedRoutes;

  const items: NavItem[] = order
    .filter((route) => allowedRoutes.includes(route))
    .map((route) => ({
      href: route,
      label: ROUTE_META[route].label,
      icon: ROUTE_META[route].icon,
      matchPath: route,
    }));

  if (role === "admin") {
    const personalItem: NavItem = {
      href: "/staff",
      label: "Personal",
      icon: Users,
      matchPath: "/staff",
    };
    items.push(personalItem);
  }

  return items;
}

function SidebarNavLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const { setOpenMobile, isMobile } = useSidebar();
  const Icon = item.icon;
  const isActive =
    pathname === item.matchPath || pathname.startsWith(`${item.matchPath}/`);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} size="lg" tooltip={item.label}>
        <Link
          href={item.href}
          onClick={() => {
            if (isMobile) {
              setOpenMobile(false);
            }
          }}
        >
          <Icon className="size-4" />
          <span>{item.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function SidebarLogoutButton() {
  const router = useRouter();
  const signOutMutation = useSignOut();
  const { setOpenMobile, isMobile } = useSidebar();

  const handleLogout = async () => {
    await signOutMutation.mutateAsync();
    if (isMobile) {
      setOpenMobile(false);
    }
    router.push("/login");
  };

  return (
    <Button
      variant="outline"
      className="min-h-11 w-full"
      onClick={handleLogout}
      disabled={signOutMutation.isPending}
    >
      {signOutMutation.isPending ? "Saliendo..." : "Cerrar sesión"}
    </Button>
  );
}

export function AppSidebar() {
  const session = useSession();
  const navItems = buildNavItems(session.role);

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <AsaderoLogo />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {session.merchantName ?? "Asadero Pro"}
            </p>
            <p className="truncate text-xs text-muted-foreground">Operación diaria</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarNavLink key={item.href} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="gap-3 border-t border-sidebar-border p-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {session.fullName ?? session.email}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {ROLE_LABELS[session.role]}
          </p>
        </div>
        <SidebarLogoutButton />
      </SidebarFooter>
    </Sidebar>
  );
}
