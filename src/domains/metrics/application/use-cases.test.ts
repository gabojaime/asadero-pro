import { describe, expect, it } from "vitest";
import { buildDashboardSnapshot } from "./build-dashboard-snapshot";
import type {
  CompletedOrderRow,
  InventoryMovementRow,
  MetricsReadRepository,
  OrderItemContributionRow,
  RecipeCostRow,
  TableSessionRow,
  WasteLogRow,
} from "../domain/repository";
import { resolvePeriodBounds } from "../domain/period-bounds";

function createFakeRepo(
  overrides: Partial<{
    orders: CompletedOrderRow[];
    movements: InventoryMovementRow[];
    waste: WasteLogRow[];
    items: OrderItemContributionRow[];
    recipes: RecipeCostRow[];
    sessions: TableSessionRow[];
  }> = {},
): MetricsReadRepository {
  return {
    getMerchantSettings: async () => ({
      targetFoodCostPct: 0.33,
      monthlyFixedOverhead: 5000,
      seatingTableCount: 10,
    }),
    listCompletedOrders: async () => overrides.orders ?? [],
    listInventoryMovements: async () => overrides.movements ?? [],
    listWasteLogs: async () => overrides.waste ?? [],
    listMeatPlateOrderItems: async () => overrides.items ?? [],
    listRecipeCosts: async () => overrides.recipes ?? [],
    listTableSessions: async () => overrides.sessions ?? [],
    updateMerchantSettings: async () => {},
  };
}

describe("buildDashboardSnapshot", () => {
  it("computes food cost and sales aggregates from fake repo", async () => {
    const bounds = resolvePeriodBounds(
      "today",
      new Date("2026-09-16T15:00:00.000Z"),
    );
    const repo = createFakeRepo({
      orders: [
        {
          id: "o1",
          totalAmount: 100,
          revenueAtIso: "2026-09-16T14:00:00.000Z",
          sentToKitchenAt: "2026-09-16T13:50:00.000Z",
          readyAt: "2026-09-16T14:10:00.000Z",
          createdAt: "2026-09-16T13:45:00.000Z",
        },
      ],
      movements: [
        {
          movementType: "order_deduction",
          quantity: 2,
          unitCost: 10,
          createdAt: "2026-09-16T14:00:00.000Z",
          unitOfMeasure: "kilogram",
        },
      ],
      waste: [{ totalCost: 5, weightKg: 0.5, reason: "burned_on_grill", createdAt: "2026-09-16T14:00:00.000Z" }],
    });

    const snapshot = await buildDashboardSnapshot("m1", bounds, repo);
    expect(snapshot.netSales).toBe(100);
    expect(snapshot.foodCostPct).toBe(25);
    expect(snapshot.ticketTimeMedian).toBe(20);
  });
});
