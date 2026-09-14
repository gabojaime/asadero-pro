import type {
  CostingConfigurationStatus,
  MeatPlateCostingRow,
  MeatPlateCostingSourceRow,
} from "../domain/entities";
import {
  calculateOptimalRetailPrice,
  calculatePlateRealCost,
  calculateYieldPct,
} from "../domain/cost-formulas";

function resolveConfigurationStatus(
  row: MeatPlateCostingSourceRow,
): CostingConfigurationStatus {
  if (!row.rawMaterialId || row.recipeQuantityKg == null) {
    return "missing_recipe";
  }

  if (row.unitCost == null || row.unitCost <= 0) {
    return "zero_wac";
  }

  if (row.wastePct == null) {
    return "missing_waste_pct";
  }

  return "ready";
}

export function buildMeatPlateCostingRow(
  source: MeatPlateCostingSourceRow,
  targetFoodCostPct: number,
): MeatPlateCostingRow {
  const configurationStatus = resolveConfigurationStatus(source);

  if (configurationStatus !== "ready") {
    return {
      ...source,
      yieldPct: source.wastePct == null ? null : calculateYieldPct(source.wastePct),
      realIngredientCost: null,
      recommendedPrice: null,
      priceDelta: null,
      configurationStatus,
    };
  }

  const wastePct = source.wastePct!;
  const unitCost = source.unitCost!;
  const recipeQuantityKg = source.recipeQuantityKg!;
  const yieldPct = calculateYieldPct(wastePct);
  const realIngredientCost = calculatePlateRealCost(
    unitCost,
    wastePct,
    recipeQuantityKg,
  );
  const recommendedPrice = calculateOptimalRetailPrice(
    realIngredientCost,
    targetFoodCostPct,
  );

  return {
    ...source,
    yieldPct,
    realIngredientCost,
    recommendedPrice,
    priceDelta: recommendedPrice - source.currentPrice,
    configurationStatus,
  };
}

export function buildMeatPlateCostingSnapshot(
  targetFoodCostPct: number,
  rows: MeatPlateCostingSourceRow[],
): { targetFoodCostPct: number; rows: MeatPlateCostingRow[] } {
  return {
    targetFoodCostPct,
    rows: rows.map((row) => buildMeatPlateCostingRow(row, targetFoodCostPct)),
  };
}
