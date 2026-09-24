import { describe, expect, it } from "vitest";
import type { Order } from "./entities";
import { OrderError } from "./errors";
import {
  assertCanMarkReady,
  isActiveKitchenOrder,
  markOrderReady,
  sortOrdersChronologically,
} from "./order-status";

const baseOrder: Order = {
  id: "order-1",
  merchantId: "merchant-1",
  serverId: "waiter-1",
  serverName: "Waiter",
  tableNumber: null,
  serviceType: "take_out",
  deliveryFee: 0,
  deliveryZone: null,
  status: "pending",
  totalAmount: 24,
  fulfillmentTiming: "immediate",
  readyByAt: null,
  customerFirstName: null,
  customerLastName: null,
  customerPhone: null,
  sentToKitchenAt: new Date("2026-09-12T10:00:00Z"),
  readyAt: null,
  createdAt: new Date("2026-09-12T10:00:00Z"),
  updatedAt: new Date("2026-09-12T10:00:00Z"),
  lines: [],
};

describe("isActiveKitchenOrder", () => {
  it("returns true for pending and cooking", () => {
    expect(isActiveKitchenOrder("pending")).toBe(true);
    expect(isActiveKitchenOrder("cooking")).toBe(true);
  });

  it("returns false for served", () => {
    expect(isActiveKitchenOrder("served")).toBe(false);
  });
});

describe("sortOrdersChronologically", () => {
  it("sorts by sentToKitchenAt ascending", () => {
    const later = {
      ...baseOrder,
      id: "order-2",
      sentToKitchenAt: new Date("2026-09-12T11:00:00Z"),
    };
    const earlier = baseOrder;

    expect(sortOrdersChronologically([later, earlier])).toEqual([
      earlier,
      later,
    ]);
  });
});

describe("assertCanMarkReady", () => {
  it("allows grill_master and admin", () => {
    expect(() => assertCanMarkReady("grill_master")).not.toThrow();
    expect(() => assertCanMarkReady("admin")).not.toThrow();
  });

  it("rejects waiter", () => {
    expect(() => assertCanMarkReady("waiter")).toThrow(OrderError);
  });
});

describe("markOrderReady", () => {
  it("transitions pending order to served", () => {
    const now = new Date("2026-09-12T10:30:00Z");
    const next = markOrderReady(baseOrder, now);

    expect(next.status).toBe("served");
    expect(next.readyAt).toEqual(now);
  });

  it("forbids marking served orders ready again", () => {
    const served = { ...baseOrder, status: "served" as const };
    expect(() => markOrderReady(served, new Date())).toThrow(OrderError);
  });
});
