import { randomUUID } from "node:crypto";
import type { CartLine, MenuItem, Order, OrderLine } from "../../domain/entities";
import { OrderError } from "../../domain/errors";
import {
  assertCanMarkReady,
  isActiveKitchenOrder,
  markOrderReady as markOrderReadyDomain,
} from "../../domain/order-status";
import type {
  InsertOrderParams,
  MarkOrderReadyParams,
  MenuCatalogRepository,
  OrderRepository,
} from "../../domain/repository";
import { menuCatalogFixture, TEST_MERCHANT_ID } from "./menu-catalog-fixture";

function findMenuItem(catalog: MenuItem[], menuItemId: string): MenuItem {
  const item = catalog.find((entry) => entry.id === menuItemId);
  if (!item) {
    throw new OrderError("validation_failed", "Artículo de menú inválido.");
  }
  return item;
}

function buildOrderLines(
  lines: CartLine[],
  catalog: MenuItem[],
): OrderLine[] {
  return lines.map((line) => {
    const menuItem = findMenuItem(catalog, line.menuItemId);
    return {
      id: randomUUID(),
      menuItemId: line.menuItemId,
      name: menuItem.name,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      subtotal: line.unitPrice * line.quantity,
      sides: line.sides.map((side) => ({
        slot: side.slot,
        sideMenuItemId: side.sideMenuItemId,
        sideName: findMenuItem(catalog, side.sideMenuItemId).name,
      })),
    };
  });
}

export function createInMemoryOrderRepos(options?: {
  catalog?: MenuItem[];
  merchantId?: string;
}) {
  const catalog = options?.catalog ?? menuCatalogFixture;
  const merchantId = options?.merchantId ?? TEST_MERCHANT_ID;
  const orders: Order[] = [];

  const catalogRepo: MenuCatalogRepository = {
    async listActiveMenu(requestedMerchantId) {
      return catalog.filter((item) => item.merchantId === requestedMerchantId);
    },
  };

  const orderRepo: OrderRepository = {
    async insertOrder(params: InsertOrderParams) {
      const now = new Date();
      const order: Order = {
        id: randomUUID(),
        merchantId: params.merchantId,
        serverId: params.serverId,
        serverName: "Test Waiter",
        tableNumber: null,
        serviceType: params.serviceType,
        deliveryFee: params.deliveryFee,
        deliveryZone: params.deliveryZone,
        status: "pending",
        totalAmount: params.totalAmount,
        sentToKitchenAt: now,
        readyAt: null,
        createdAt: now,
        updatedAt: now,
        lines: buildOrderLines(params.lines, params.menuCatalog),
      };

      orders.push(order);
      return order;
    },

    async listActiveOrders(requestedMerchantId) {
      return orders.filter(
        (order) =>
          order.merchantId === requestedMerchantId &&
          isActiveKitchenOrder(order.status),
      );
    },

    async markReady(params: MarkOrderReadyParams) {
      assertCanMarkReady(params.actorRole);

      const index = orders.findIndex(
        (order) =>
          order.id === params.orderId && order.merchantId === params.merchantId,
      );

      if (index === -1) {
        throw new OrderError("not_found", "Pedido no encontrado.");
      }

      const current = orders[index]!;
      const next = markOrderReadyDomain(current, new Date());
      orders[index] = next;
      return next;
    },
  };

  return {
    catalogRepo,
    orderRepo,
    getOrdersSnapshot: () => [...orders],
    merchantId,
  };
}
