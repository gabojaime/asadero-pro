import type { UserRole } from "@/domains/auth/domain/entities";
import type { KitchenPriorityTier, Order, OrderStatus } from "./entities";
import { OrderError } from "./errors";

export const ACTIVE_KITCHEN_STATUSES = ["pending", "cooking"] as const;

export function getKitchenPriorityTier(
  order: Pick<Order, "fulfillmentTiming" | "readyByAt">,
  now: Date,
  horizonMinutes: number,
): KitchenPriorityTier {
  if (order.fulfillmentTiming === "immediate") {
    return "urgent";
  }

  if (order.readyByAt == null) {
    return "urgent";
  }

  const minutesUntilReady =
    (order.readyByAt.getTime() - now.getTime()) / 60_000;
  return minutesUntilReady <= horizonMinutes ? "urgent" : "deferred";
}

export function sortKitchenQueueOrders(input: {
  orders: Order[];
  now: Date;
  horizonMinutes: number;
}): Order[] {
  const { orders, now, horizonMinutes } = input;
  const withTier = orders.map((order) => ({
    order,
    tier: getKitchenPriorityTier(order, now, horizonMinutes),
  }));

  const urgent = withTier
    .filter((entry) => entry.tier === "urgent")
    .sort(
      (left, right) =>
        left.order.sentToKitchenAt.getTime() -
        right.order.sentToKitchenAt.getTime(),
    );

  const deferred = withTier
    .filter((entry) => entry.tier === "deferred")
    .sort((left, right) => {
      const byReady =
        (left.order.readyByAt?.getTime() ?? 0) -
        (right.order.readyByAt?.getTime() ?? 0);
      if (byReady !== 0) {
        return byReady;
      }
      return (
        left.order.sentToKitchenAt.getTime() -
        right.order.sentToKitchenAt.getTime()
      );
    });

  return [...urgent, ...deferred].map((entry) => entry.order);
}

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
