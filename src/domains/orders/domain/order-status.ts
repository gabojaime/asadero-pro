import type { UserRole } from "@/domains/auth/domain/entities";
import type { Order, OrderStatus } from "./entities";
import { OrderError } from "./errors";

export const ACTIVE_KITCHEN_STATUSES = ["pending", "cooking"] as const;

export function isActiveKitchenOrder(status: OrderStatus): boolean {
  return ACTIVE_KITCHEN_STATUSES.includes(
    status as (typeof ACTIVE_KITCHEN_STATUSES)[number],
  );
}

export function sortOrdersChronologically(orders: Order[]): Order[] {
  return [...orders].sort(
    (left, right) =>
      left.sentToKitchenAt.getTime() - right.sentToKitchenAt.getTime(),
  );
}

export function assertCanMarkReady(actorRole: UserRole): void {
  if (actorRole !== "grill_master" && actorRole !== "admin") {
    throw new OrderError(
      "forbidden_mark_ready",
      "No tienes permiso para marcar pedidos como listos.",
    );
  }
}

export function markOrderReady(order: Order, now: Date): Order {
  if (!isActiveKitchenOrder(order.status)) {
    throw new OrderError(
      "order_not_active",
      "El pedido no está disponible en cocina.",
    );
  }

  return {
    ...order,
    status: "served",
    readyAt: now,
    updatedAt: now,
  };
}
