import { describe, expect, it } from "vitest";
import type { Order } from "./entities";
import {
  getKitchenPriorityTier,
  sortKitchenQueueOrders,
} from "./order-status";

function buildOrder(overrides: Partial<Order> = {}): Order {
  return {
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
    sentToKitchenAt: new Date("2026-09-24T14:00:00Z"),
    readyAt: null,
    createdAt: new Date("2026-09-24T14:00:00Z"),
    updatedAt: new Date("2026-09-24T14:00:00Z"),
    lines: [],
    ...overrides,
  };
}

describe("getKitchenPriorityTier", () => {
  const now = new Date("2026-09-24T15:00:00Z");
  const horizonMinutes = 45;

  it("treats immediate orders as urgent", () => {
    expect(getKitchenPriorityTier(buildOrder(), now, horizonMinutes)).toBe(
      "urgent",
    );
  });

  it("treats scheduled orders beyond horizon as deferred", () => {
    const deferred = buildOrder({
      fulfillmentTiming: "scheduled",
      readyByAt: new Date("2026-09-24T16:00:00Z"),
    });
    expect(getKitchenPriorityTier(deferred, now, horizonMinutes)).toBe(
      "deferred",
    );
  });

  it("treats scheduled orders within horizon as urgent (inclusive at boundary)", () => {
    const atBoundary = buildOrder({
      fulfillmentTiming: "scheduled",
      readyByAt: new Date("2026-09-24T15:45:00Z"),
    });
    expect(getKitchenPriorityTier(atBoundary, now, horizonMinutes)).toBe(
      "urgent",
    );
  });
});

describe("sortKitchenQueueOrders", () => {
  const now = new Date("2026-09-24T15:00:00Z");
  const horizonMinutes = 45;

  it("places deferred scheduled orders below immediate tickets", () => {
    const immediate = buildOrder({
      id: "immediate",
      sentToKitchenAt: new Date("2026-09-24T14:30:00Z"),
    });
    const deferred = buildOrder({
      id: "deferred",
      fulfillmentTiming: "scheduled",
      readyByAt: new Date("2026-09-24T18:00:00Z"),
      sentToKitchenAt: new Date("2026-09-24T14:00:00Z"),
    });

    const sorted = sortKitchenQueueOrders({
      orders: [deferred, immediate],
      now,
      horizonMinutes,
    });

    expect(sorted.map((order) => order.id)).toEqual(["immediate", "deferred"]);
  });

  it("sorts urgent tier FIFO by sentToKitchenAt including mixed immediate and soon scheduled", () => {
    const immediateLate = buildOrder({
      id: "immediate-late",
      sentToKitchenAt: new Date("2026-09-24T14:20:00Z"),
    });
    const immediateEarly = buildOrder({
      id: "immediate-early",
      sentToKitchenAt: new Date("2026-09-24T14:10:00Z"),
    });
    const soonScheduled = buildOrder({
      id: "soon-scheduled",
      fulfillmentTiming: "scheduled",
      readyByAt: new Date("2026-09-24T15:30:00Z"),
      sentToKitchenAt: new Date("2026-09-24T14:15:00Z"),
    });

    const sorted = sortKitchenQueueOrders({
      orders: [immediateLate, soonScheduled, immediateEarly],
      now,
      horizonMinutes,
    });

    expect(sorted.map((order) => order.id)).toEqual([
      "immediate-early",
      "soon-scheduled",
      "immediate-late",
    ]);
  });

  it("sorts deferred tier by readyByAt then sentToKitchenAt", () => {
    const deferredLaterReady = buildOrder({
      id: "deferred-b",
      fulfillmentTiming: "scheduled",
      readyByAt: new Date("2026-09-24T19:00:00Z"),
      sentToKitchenAt: new Date("2026-09-24T13:00:00Z"),
    });
    const deferredEarlierReady = buildOrder({
      id: "deferred-a",
      fulfillmentTiming: "scheduled",
      readyByAt: new Date("2026-09-24T17:00:00Z"),
      sentToKitchenAt: new Date("2026-09-24T14:00:00Z"),
    });

    const sorted = sortKitchenQueueOrders({
      orders: [deferredLaterReady, deferredEarlierReady],
      now,
      horizonMinutes,
    });

    expect(sorted.map((order) => order.id)).toEqual([
      "deferred-a",
      "deferred-b",
    ]);
  });
});
