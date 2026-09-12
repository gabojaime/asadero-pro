import { describe, expect, it, vi } from "vitest";
import type { SessionProfile } from "@/domains/auth/domain/entities";
import { createEmptyCart, type Cart, type MenuItem, type Order } from "../domain/entities";
import { OrderError } from "../domain/errors";
import type { MenuCatalogRepository, OrderRepository } from "../domain/repository";
import {
  listActiveOrders,
  markOrderReady,
  submitOrder,
} from "./use-cases";

const MERCHANT_ID = "11111111-1111-4111-8111-111111111111";
const BEEF_ID = "22222222-2222-4222-8222-222222222222";
const YUCA_ID = "33333333-3333-4333-8333-333333333333";
const AREPA_ID = "44444444-4444-4444-8444-444444444444";

const waiterProfile: SessionProfile = {
  userId: "55555555-5555-4555-8555-555555555555",
  email: "waiter@test.com",
  merchantId: MERCHANT_ID,
  merchantName: "Test Asadero",
  fullName: "Waiter User",
  role: "waiter",
  isOnboarded: true,
};

const grillMasterProfile: SessionProfile = {
  ...waiterProfile,
  userId: "66666666-6666-4666-8666-666666666666",
  role: "grill_master",
};

const catalog: MenuItem[] = [
  {
    id: BEEF_ID,
    merchantId: MERCHANT_ID,
    name: "Beef 1/2 kg",
    price: 24,
    itemKind: "meat_plate",
    proteinGroup: "beef",
    weightLabel: "500g",
    isActive: true,
  },
  {
    id: YUCA_ID,
    merchantId: MERCHANT_ID,
    name: "Yuca",
    price: 0,
    itemKind: "side",
    proteinGroup: null,
    weightLabel: null,
    isActive: true,
  },
  {
    id: AREPA_ID,
    merchantId: MERCHANT_ID,
    name: "Arepa",
    price: 0,
    itemKind: "side",
    proteinGroup: null,
    weightLabel: null,
    isActive: true,
  },
];

function buildCart(overrides: Partial<Cart> = {}): Cart {
  return {
    ...createEmptyCart(),
    lines: [
      {
        menuItemId: BEEF_ID,
        quantity: 1,
        unitPrice: 24,
        sides: [
          { slot: 1, sideMenuItemId: YUCA_ID },
          { slot: 2, sideMenuItemId: AREPA_ID },
        ],
      },
    ],
    ...overrides,
  };
}

const insertedOrder: Order = {
  id: "77777777-7777-4777-8777-777777777777",
  merchantId: MERCHANT_ID,
  serverId: waiterProfile.userId,
  serverName: waiterProfile.fullName,
  tableNumber: null,
  serviceType: "take_out",
  deliveryFee: 0,
  deliveryZone: null,
  status: "pending",
  totalAmount: 24,
  sentToKitchenAt: new Date("2026-09-12T10:00:00Z"),
  readyAt: null,
  createdAt: new Date("2026-09-12T10:00:00Z"),
  updatedAt: new Date("2026-09-12T10:00:00Z"),
  lines: [],
};

function createCatalogRepo(
  overrides: Partial<MenuCatalogRepository> = {},
): MenuCatalogRepository {
  return {
    listActiveMenu: vi.fn().mockResolvedValue(catalog),
    ...overrides,
  };
}

function createOrderRepo(
  overrides: Partial<OrderRepository> = {},
): OrderRepository {
  return {
    insertOrder: vi.fn().mockResolvedValue(insertedOrder),
    listActiveOrders: vi.fn().mockResolvedValue([insertedOrder]),
    markReady: vi.fn().mockResolvedValue({
      ...insertedOrder,
      status: "served",
      readyAt: new Date("2026-09-12T10:30:00Z"),
    }),
    ...overrides,
  };
}

describe("submitOrder", () => {
  it("computes total with delivery fee for delivery orders", async () => {
    const orderRepo = createOrderRepo();
    const catalogRepo = createCatalogRepo();
    const cart = buildCart({
      serviceType: "delivery",
      deliveryFee: 4.5,
      deliveryZone: "Centro",
    });

    await submitOrder(cart, waiterProfile, catalogRepo, orderRepo);

    expect(orderRepo.insertOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceType: "delivery",
        deliveryFee: 4.5,
        deliveryZone: "Centro",
        totalAmount: 28.5,
      }),
    );
  });

  it("persists zero delivery fee for takeaway", async () => {
    const orderRepo = createOrderRepo();
    const catalogRepo = createCatalogRepo();

    await submitOrder(buildCart(), waiterProfile, catalogRepo, orderRepo);

    expect(orderRepo.insertOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceType: "take_out",
        deliveryFee: 0,
        deliveryZone: null,
        totalAmount: 24,
      }),
    );
  });
});

describe("markOrderReady", () => {
  it("rejects waiter role", async () => {
    const orderRepo = createOrderRepo();

    await expect(
      markOrderReady(
        insertedOrder.id,
        waiterProfile,
        orderRepo,
      ),
    ).rejects.toThrow(OrderError);
  });

  it("delegates to repository for grill master", async () => {
    const orderRepo = createOrderRepo();

    const result = await markOrderReady(
      insertedOrder.id,
      grillMasterProfile,
      orderRepo,
    );

    expect(orderRepo.markReady).toHaveBeenCalled();
    expect(result.status).toBe("served");
  });
});

describe("listActiveOrders", () => {
  it("returns chronologically sorted orders", async () => {
    const later = {
      ...insertedOrder,
      id: "88888888-8888-4888-8888-888888888888",
      sentToKitchenAt: new Date("2026-09-12T11:00:00Z"),
    };
    const orderRepo = createOrderRepo({
      listActiveOrders: vi.fn().mockResolvedValue([later, insertedOrder]),
    });

    const result = await listActiveOrders(MERCHANT_ID, orderRepo);

    expect(result[0]?.id).toBe(insertedOrder.id);
    expect(result[1]?.id).toBe(later.id);
  });
});
