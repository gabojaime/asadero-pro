"use server";

import {
  completeOrder,
  listActiveOrders,
  listMenuItems,
  listServedOrders,
  markOrderReady,
  submitOrder,
} from "@/domains/orders/application/use-cases";
import type { Cart } from "@/domains/orders/domain/entities";
import { OrderError } from "@/domains/orders/domain/errors";
import { WasteError } from "@/domains/waste/domain/errors";
import { createMenuCatalogRepository } from "@/domains/orders/infrastructure/supabase-menu-catalog-repo";
import { createOrderRepository } from "@/domains/orders/infrastructure/supabase-order-repo";
import { createMerchantKitchenSettingsRepository } from "@/domains/orders/infrastructure/supabase-merchant-kitchen-settings-repo";
import { createInventoryDeductionRepository } from "@/domains/waste/infrastructure/supabase-costing-repo";
import { getServerSessionProfile } from "@/domains/auth/infrastructure/session-profile-server";
import { createClient } from "@/shared/infrastructure/supabase/server";
import type {
  ActionFailure,
  MenuItemDto,
  OrderDto,
  OrderItemSideDto,
} from "./order-dtos";

function mapError(error: unknown): ActionFailure {
  if (error instanceof OrderError) {
    return {
      success: false,
      code: error.code,
      message: error.message,
      fieldErrors: error.fieldErrors,
    };
  }

  if (error instanceof WasteError) {
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
  fulfillmentTiming: string;
  readyByAt: Date | null;
  customerFirstName: string | null;
  customerLastName: string | null;
  customerPhone: string | null;
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
    fulfillmentTiming: order.fulfillmentTiming,
    readyByAt: order.readyByAt?.toISOString() ?? null,
    customerFirstName: order.customerFirstName,
    customerLastName: order.customerLastName,
    customerPhone: order.customerPhone,
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
    merchantSettingsRepo: createMerchantKitchenSettingsRepository(supabase),
    deductionRepo: createInventoryDeductionRepository(supabase),
  };
}

export async function getMerchantKitchenSettingsAction(): Promise<
  | {
      success: true;
      settings: {
        timezone: string;
        kitchenPriorityHorizonMinutes: number;
      };
    }
  | ActionFailure
> {
  try {
    const { profile, merchantSettingsRepo } = await getAuthenticatedContext();
    const settings = await merchantSettingsRepo.getKitchenSettings(
      profile.merchantId!,
    );
    return { success: true, settings };
  } catch (error) {
    return mapError(error);
  }
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
    const { profile, orderRepo, merchantSettingsRepo } =
      await getAuthenticatedContext();
    const orders = await listActiveOrders(
      profile.merchantId!,
      orderRepo,
      merchantSettingsRepo,
    );
    return { success: true, orders: orders.map(serializeOrder) };
  } catch (error) {
    return mapError(error);
  }
}

export async function submitOrderAction(
  cart: Cart,
): Promise<{ success: true; order: OrderDto } | ActionFailure> {
  try {
    const { profile, catalogRepo, orderRepo, merchantSettingsRepo } =
      await getAuthenticatedContext();
    const order = await submitOrder(
      cart,
      profile,
      catalogRepo,
      orderRepo,
      merchantSettingsRepo,
    );
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

export async function listServedOrdersAction():
  Promise<{ success: true; orders: OrderDto[] } | ActionFailure> {
  try {
    const { profile, orderRepo } = await getAuthenticatedContext();
    const orders = await listServedOrders(profile.merchantId!, orderRepo);
    return { success: true, orders: orders.map(serializeOrder) };
  } catch (error) {
    return mapError(error);
  }
}

export async function completeOrderAction(input: {
  orderId: string;
}): Promise<
  | {
      success: true;
      order: OrderDto;
      idempotent: boolean;
      partialDeduction: boolean;
    }
  | ActionFailure
> {
  try {
    const { profile, orderRepo, deductionRepo } = await getAuthenticatedContext();
    const result = await completeOrder(
      input.orderId,
      profile,
      orderRepo,
      deductionRepo,
    );
    return {
      success: true,
      order: serializeOrder(result.order),
      idempotent: result.idempotent,
      partialDeduction: result.partialDeduction,
    };
  } catch (error) {
    return mapError(error);
  }
}

export type { ActionFailure, MenuItemDto, OrderDto } from "./order-dtos";
