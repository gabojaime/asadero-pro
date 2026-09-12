import type { SessionProfile } from "@/domains/auth/domain/entities";
import { computeOrderTotal } from "../domain/cart";
import type { Cart } from "../domain/entities";
import { OrderError } from "../domain/errors";
import {
  assertCanMarkReady,
  sortOrdersChronologically,
} from "../domain/order-status";
import type {
  MenuCatalogRepository,
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
) {
  assertCanSubmitOrder(actor);

  const merchantId = actor.merchantId!;
  const catalog = await catalogRepo.listActiveMenu(merchantId);
  const validatedCart = validateCartForSubmit(cart, catalog);
  const totalAmount = computeOrderTotal(validatedCart);

  return orderRepo.insertOrder({
    merchantId,
    serverId: actor.userId,
    serviceType: validatedCart.serviceType,
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
) {
  const orders = await orderRepo.listActiveOrders(merchantId);
  return sortOrdersChronologically(orders);
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
