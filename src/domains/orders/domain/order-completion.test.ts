import { describe, expect, it } from "vitest";
import type { Order } from "./entities";
import { OrderError } from "./errors";
import { completeOrder } from "./order-completion";

const baseOrder: Order = {
  id: "11111111-1111-4111-8111-111111111111",
  merchantId: "22222222-2222-4222-8222-222222222222",
  serverId: null,
  serverName: null,
  tableNumber: null,
  serviceType: "take_out",
  deliveryFee: 0,
  deliveryZone: null,
  status: "served",
  totalAmount: 24,
  fulfillmentTiming: "immediate",
  readyByAt: null,
  customerFirstName: null,
  customerLastName: null,
  customerPhone: null,
  sentToKitchenAt: new Date("2026-09-12T12:00:00.000Z"),
  readyAt: new Date("2026-09-12T12:30:00.000Z"),
  createdAt: new Date("2026-09-12T12:00:00.000Z"),
  updatedAt: new Date("2026-09-12T12:30:00.000Z"),
  lines: [],
};

describe("completeOrder", () => {
  it("transitions served orders to completed", () => {
    const now = new Date("2026-09-12T13:00:00.000Z");
    const result = completeOrder(baseOrder, now);

    expect(result.status).toBe("completed");
    expect(result.updatedAt).toBe(now);
  });

  it("rejects non-served statuses", () => {
    const pendingOrder = { ...baseOrder, status: "pending" as const };

    expect(() => completeOrder(pendingOrder, new Date())).toThrow(OrderError);
    expect(() =>
      completeOrder({ ...baseOrder, status: "completed" }, new Date()),
    ).toThrow(OrderError);
  });
});
