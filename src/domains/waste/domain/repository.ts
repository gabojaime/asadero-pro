import type { UserRole } from "@/domains/auth/domain/entities";
import type { ProteinGroup } from "@/domains/orders/domain/entities";
import type {
  MeatPlateCostingSnapshot,
  MeatPlateCostingSourceRow,
} from "./entities";
import type {
  KgRawMaterialOption,
  OperationalWasteLog,
  OperationalWasteLogInput,
} from "./operational-waste";
import type { InventoryMaterialRef } from "./protein-inventory-link";

export interface CostingRepository {
  listMeatPlateCosting(merchantId: string): Promise<{
    targetFoodCostPct: number;
    rows: MeatPlateCostingSourceRow[];
  }>;
  listProteinInventoryMaterials(
    merchantId: string,
  ): Promise<InventoryMaterialRef[]>;
  upsertWastePct(params: {
    merchantId: string;
    menuItemId: string;
    wastePct: number;
  }): Promise<void>;
  ensureInferredRecipeIngredient(params: {
    merchantId: string;
    menuItemId: string;
    proteinGroup: ProteinGroup | null;
    weightLabel: string | null;
  }): Promise<boolean>;
  ensureDefaultWastePctIfMissing(params: {
    merchantId: string;
    menuItemId: string;
    proteinGroup: ProteinGroup;
  }): Promise<boolean>;
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

export interface OperationalWasteRepository {
  logWaste(params: {
    merchantId: string;
    actorUserId: string;
    actorRole: UserRole;
    input: OperationalWasteLogInput;
  }): Promise<{ log: OperationalWasteLog; partialStock: boolean }>;

  listLogsForLocalDay(params: {
    merchantId: string;
    dayStartIso: string;
    dayEndIso: string;
    limit: number;
  }): Promise<OperationalWasteLog[]>;

  listKgRawMaterials(merchantId: string): Promise<KgRawMaterialOption[]>;
}

export type { MeatPlateCostingSnapshot };
