import type {
  MeatPlateCostingSnapshot,
  MeatPlateCostingSourceRow,
} from "./entities";

export interface CostingRepository {
  listMeatPlateCosting(merchantId: string): Promise<{
    targetFoodCostPct: number;
    rows: MeatPlateCostingSourceRow[];
  }>;
  upsertWastePct(params: {
    merchantId: string;
    menuItemId: string;
    wastePct: number;
  }): Promise<void>;
  updateTargetFoodCostPct(params: {
    merchantId: string;
    targetFoodCostPct: number;
  }): Promise<number>;
}

export interface InventoryDeductionRepository {
  completeOrderAndDeduct(params: { orderId: string }): Promise<{
    idempotent: boolean;
    partialDeduction: boolean;
    deductions: Array<{
      rawMaterialId: string;
      requestedKg: number;
      appliedKg: number;
    }>;
  }>;
}

export type { MeatPlateCostingSnapshot };
