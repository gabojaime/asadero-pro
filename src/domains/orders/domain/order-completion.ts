import type { Order } from "./entities";
import { OrderError } from "./errors";

export function completeOrder(order: Order, now: Date): Order {
  if (order.status === "completed") {
    throw new OrderError(
      "order_not_completable",
      "El pedido ya fue completado.",
    );
  }

  if (order.status !== "served") {
    throw new OrderError(
      "order_not_completable",
      "Solo se pueden completar pedidos en estado servido.",
    );
  }

  return {
    ...order,
    status: "completed",
    updatedAt: now,
  };
}
