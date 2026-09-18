import type {
  DashboardPeriod,
  MerchantDashboardSettings,
  PeriodBounds,
} from "./entities";

export interface CompletedOrderRow {
  id: string;
  totalAmount: number;
  revenueAtIso: string;
  sentToKitchenAt: string | null;
  readyAt: string | null;
  createdAt: string;
}

export interface InventoryMovementRow {
  movementType: string;
  quantity: number;
  unitCost: number;
  createdAt: string;
  unitOfMeasure: "kilogram" | "unit" | null;
}

export interface WasteLogRow {
  totalCost: number;
  weightKg: number;
  reason: string;
  createdAt: string;
}

export interface OrderItemContributionRow {
  menuItemId: string;
  name: string;
  proteinGroup: string | null;
  weightLabel: string | null;
  itemKind: string;
  quantity: number;
  subtotal: number;
  revenueAtIso: string;
}

export interface RecipeCostRow {
  menuItemId: string;
  rawMaterialId: string;
  quantityKg: number;
  unitCost: number;
  wastePct: number | null;
}

export interface TableSessionRow {
  closedAt: string;
  dayOfWeek: number;
  hour: number;
}

export interface MetricsReadRepository {
  getMerchantSettings(merchantId: string): Promise<MerchantDashboardSettings>;
  listCompletedOrders(
    merchantId: string,
    bounds: PeriodBounds,
  ): Promise<CompletedOrderRow[]>;
  listInventoryMovements(
    merchantId: string,
    bounds: PeriodBounds,
  ): Promise<InventoryMovementRow[]>;
  listWasteLogs(
    merchantId: string,
    bounds: PeriodBounds,
  ): Promise<WasteLogRow[]>;
  listMeatPlateOrderItems(
    merchantId: string,
    bounds: PeriodBounds,
  ): Promise<OrderItemContributionRow[]>;
  listRecipeCosts(merchantId: string): Promise<RecipeCostRow[]>;
  listTableSessions(
    merchantId: string,
    bounds: PeriodBounds,
  ): Promise<TableSessionRow[]>;
  updateMerchantSettings(
    merchantId: string,
    input: {
      monthlyFixedOverhead: number | null;
      seatingTableCount: number | null;
    },
  ): Promise<void>;
}

export type { DashboardPeriod };
