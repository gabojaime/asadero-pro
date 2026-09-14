import type { ProteinGroup } from "@/domains/orders/domain/entities";

export type CostingConfigurationStatus =
  | "ready"
  | "missing_recipe"
  | "zero_wac"
  | "missing_waste_pct";

export type MeatPlateCostingSourceRow = {
  menuItemId: string;
  name: string;
  weightLabel: string | null;
  proteinGroup: ProteinGroup | null;
  currentPrice: number;
  rawMaterialId: string | null;
  rawMaterialName: string | null;
  unitCost: number | null;
  recipeQuantityKg: number | null;
  wastePct: number | null;
};

export type MeatPlateCostingRow = MeatPlateCostingSourceRow & {
  yieldPct: number | null;
  realIngredientCost: number | null;
  recommendedPrice: number | null;
  priceDelta: number | null;
  configurationStatus: CostingConfigurationStatus;
};

export type MeatPlateCostingSnapshot = {
  targetFoodCostPct: number;
  rows: MeatPlateCostingRow[];
};
