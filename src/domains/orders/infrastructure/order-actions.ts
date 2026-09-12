"use server";

import {
  listActiveOrders,
  listMenuItems,
  markOrderReady,
  submitOrder,
} from "@/domains/orders/application/use-cases";
import type { Cart } from "@/domains/orders/domain/entities";
import { OrderError } from "@/domains/orders/domain/errors";
import { createMenuCatalogRepository } from "@/domains/orders/infrastructure/supabase-menu-catalog-repo";
import { createOrderRepository } from "@/domains/orders/infrastructure/supabase-order-repo";
import { getServerSessionProfile } from "@/domains/auth/infrastructure/session-profile-server";
import { createClient } from "@/shared/infrastructure/supabase/server";

type ActionFailure = {
  success: false;
  code: string;
  message: string;
  fieldErrors?: Record<string, string>;
};

type MenuItemDto = {
  id: string;
  merchantId: string;
  name: string;
  price: number;
  itemKind: string;
  proteinGroup: string | null;
  weightLabel: string | null;
  isActive: boolean;
};

type OrderItemSideDto = {
  slot: 1 | 2;
  sideMenuItemId: string;
  sideName: string;
};

type OrderLineDto = {
  id: string;
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  sides: OrderItemSideDto[];
};

type OrderDto = {
  id: string;
  merchantId: string;
  serverId: string | null;
  serverName: string | null;
  tableNumber: number | null;
  serviceType: string;
  deliveryFee: number;
  deliveryZone: string | null;
  status: string;
  totalAmount: number;
  sentToKitchenAt: string;
  readyAt: string | null;
  createdAt: string;
  updatedAt: string;
  lines: OrderLineDto[];
};

function mapError(error: unknown): ActionFailure {
  if (error instanceof OrderError) {
    return {
      success: false,
      code: error.code,
      message: error.message,
      fieldErrors: error.fieldErrors,
    };
  }

  return {
    success: false,
    code: "unknown",
    message: "No se pudo completar la operación. Intenta de nuevo.",
  };
}

function serializeMenuItem(item: {
  id: string;
  merchantId: string;
  name: string;
  price: number;
  itemKind: string;
  proteinGroup: string | null;
  weightLabel: string | null;
  isActive: boolean;
}): MenuItemDto {
  return { ...item };
}

function serializeOrder(order: {
  id: string;
  merchantId: string;
  serverId: string | null;
  serverName: string | null;
  tableNumber: number | null;
  serviceType: string;
  deliveryFee: number;
  deliveryZone: string | null;
  status: string;
  totalAmount: number;
  sentToKitchenAt: Date;
  readyAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  lines: Array<{
    id: string;
    menuItemId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    sides: OrderItemSideDto[];
  }>;
}): OrderDto {
  return {
    ...order,
    sentToKitchenAt: order.sentToKitchenAt.toISOString(),
    readyAt: order.readyAt?.toISOString() ?? null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

async function getAuthenticatedContext() {
  const profile = await getServerSessionProfile();
  if (!profile?.merchantId || !profile.role) {
    throw new OrderError("not_authenticated", "Sesión inválida.");
  }

  const supabase = await createClient();
  return {
    profile,
    catalogRepo: createMenuCatalogRepository(supabase),
    orderRepo: createOrderRepository(supabase),
  };
}

export async function listMenuItemsAction():
  Promise<{ success: true; items: MenuItemDto[] } | ActionFailure> {
  try {
    const { profile, catalogRepo } = await getAuthenticatedContext();
    const items = await listMenuItems(profile.merchantId!, catalogRepo);
    return { success: true, items: items.map(serializeMenuItem) };
  } catch (error) {
    return mapError(error);
  }
}

export async function listActiveOrdersAction():
  Promise<{ success: true; orders: OrderDto[] } | ActionFailure> {
  try {
    const { profile, orderRepo } = await getAuthenticatedContext();
    const orders = await listActiveOrders(profile.merchantId!, orderRepo);
    return { success: true, orders: orders.map(serializeOrder) };
  } catch (error) {
    return mapError(error);
  }
}

export async function submitOrderAction(
  cart: Cart,
): Promise<{ success: true; order: OrderDto } | ActionFailure> {
  try {
    const { profile, catalogRepo, orderRepo } = await getAuthenticatedContext();
    const order = await submitOrder(cart, profile, catalogRepo, orderRepo);
    return { success: true, order: serializeOrder(order) };
  } catch (error) {
    return mapError(error);
  }
}

export async function markOrderReadyAction(input: {
  orderId: string;
}): Promise<{ success: true; order: OrderDto } | ActionFailure> {
  try {
    const { profile, orderRepo } = await getAuthenticatedContext();
    const order = await markOrderReady(input.orderId, profile, orderRepo);
    return { success: true, order: serializeOrder(order) };
  } catch (error) {
    return mapError(error);
  }
}

export type { ActionFailure, MenuItemDto, OrderDto };
