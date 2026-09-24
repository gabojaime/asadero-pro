import type { SessionProfile } from "@/domains/auth/domain/entities";
import type { InventoryDeductionRepository } from "@/domains/waste/domain/repository";
import { computeOrderTotal } from "../domain/cart";
import type { Cart } from "../domain/entities";
import { OrderError } from "../domain/errors";
import { completeOrder as completeOrderDomain } from "../domain/order-completion";
import {
  assertCanMarkReady,
  sortKitchenQueueOrders,
  sortOrdersChronologically,
} from "../domain/order-status";
import type {
  MenuCatalogRepository,
  MerchantKitchenSettingsRepository,
  OrderRepository,
} from "../domain/repository";
import { validateCartForSubmit } from "../domain/validations";

function assertCanSubmitOrder(profile: SessionProfile): void {
  if (profile.role !== "waiter" && profile.role !== "admin") {
    throw new OrderError(
      "forbidden",
      "No tienes permiso para registrar pedidos.",
    );
  }

  if (!profile.merchantId) {
    throw new OrderError("not_authenticated", "Sesión inválida.");
  }
}

function assertCanCompleteOrder(profile: SessionProfile): void {
  if (profile.role !== "waiter" && profile.role !== "admin") {
    throw new OrderError(
      "forbidden_complete_order",
      "No tienes permiso para completar pedidos.",
    );
  }

  if (!profile.merchantId) {
    throw new OrderError("not_authenticated", "Sesión inválida.");
  }
}

export async function listMenuItems(
  merchantId: string,
  catalogRepo: MenuCatalogRepository,
) {
  return catalogRepo.listActiveMenu(merchantId);
}

export async function submitOrder(
  cart: Cart,
  actor: SessionProfile,
  catalogRepo: MenuCatalogRepository,
  orderRepo: OrderRepository,
  merchantSettingsRepo: MerchantKitchenSettingsRepository,
) {
  assertCanSubmitOrder(actor);

  const merchantId = actor.merchantId!;
  const [catalog, kitchenSettings] = await Promise.all([
    catalogRepo.listActiveMenu(merchantId),
    merchantSettingsRepo.getKitchenSettings(merchantId),
  ]);
  const now = new Date();
  const validatedCart = validateCartForSubmit(cart, catalog, {
    now,
    merchantTimezone: kitchenSettings.timezone,
  });
  const totalAmount = computeOrderTotal(validatedCart);

  return orderRepo.insertOrder({
    merchantId,
    serverId: actor.userId,
    serviceType: validatedCart.serviceType,
    fulfillmentTiming: validatedCart.fulfillmentTiming,
    readyByAt:
      validatedCart.fulfillmentTiming === "scheduled"
        ? validatedCart.readyByAt
        : null,
    customerFirstName: validatedCart.customerFirstName,
    customerLastName: validatedCart.customerLastName,
    customerPhone: validatedCart.customerPhone,
    deliveryFee:
      validatedCart.serviceType === "delivery" ? validatedCart.deliveryFee : 0,
    deliveryZone:
      validatedCart.serviceType === "delivery"
        ? validatedCart.deliveryZone
        : null,
    lines: validatedCart.lines,
    menuCatalog: catalog,
    totalAmount,
  });
}

export async function listActiveOrders(
  merchantId: string,
  orderRepo: OrderRepository,
  merchantSettingsRepo: MerchantKitchenSettingsRepository,
) {
  const [orders, kitchenSettings] = await Promise.all([
    orderRepo.listActiveOrders(merchantId),
    merchantSettingsRepo.getKitchenSettings(merchantId),
  ]);
  return sortKitchenQueueOrders({
    orders,
    now: new Date(),
    horizonMinutes: kitchenSettings.kitchenPriorityHorizonMinutes,
  });
}

export async function markOrderReady(
  orderId: string,
  actor: SessionProfile,
  orderRepo: OrderRepository,
) {
  if (!actor.merchantId) {
    throw new OrderError("not_authenticated", "Sesión inválida.");
  }

  assertCanMarkReady(actor.role!);

  return orderRepo.markReady({
    merchantId: actor.merchantId,
    orderId,
    actorRole: actor.role!,
  });
}

export async function listServedOrders(
  merchantId: string,
  orderRepo: OrderRepository,
) {
  const orders = await orderRepo.listServedOrders(merchantId);
  return sortOrdersChronologically(orders);
}

export async function completeOrder(
  orderId: string,
  actor: SessionProfile,
  orderRepo: OrderRepository,
  deductionRepo: InventoryDeductionRepository,
) {
  assertCanCompleteOrder(actor);

  const existing = await orderRepo.getOrderById(actor.merchantId!, orderId);
  if (!existing) {
    throw new OrderError("not_found", "Pedido no encontrado.");
  }

  if (existing.status !== "served" && existing.status !== "completed") {
    throw new OrderError(
      "order_not_completable",
      "Solo se pueden completar pedidos en estado servido.",
    );
  }

  if (existing.status === "served") {
    completeOrderDomain(existing, new Date());
  }

  const result = await deductionRepo.completeOrderAndDeduct({ orderId });

  const refreshed = await orderRepo.getOrderById(actor.merchantId!, orderId);
  if (!refreshed) {
    throw new OrderError("not_found", "Pedido no encontrado.");
  }

  return {
    order: refreshed,
    idempotent: result.idempotent,
    partialDeduction: result.partialDeduction,
  };
}
