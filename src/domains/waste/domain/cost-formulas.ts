import { WasteError } from "./errors";

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateYieldPct(wastePct: number): number {
  return 100 - wastePct;
}

export function calculateRealCostPerKg(
  purchaseCostPerKg: number,
  wastePct: number,
): number {
  const yieldPct = calculateYieldPct(wastePct);
  if (yieldPct <= 0) {
    throw new WasteError(
      "validation_failed",
      "Waste percentage must be less than 100.",
    );
  }

  return roundMoney(purchaseCostPerKg / (yieldPct / 100));
}

export function calculatePlateRealCost(
  purchaseCostPerKg: number,
  wastePct: number,
  recipeQuantityKg: number,
): number {
  const realCostPerKg = calculateRealCostPerKg(purchaseCostPerKg, wastePct);
  return roundMoney(realCostPerKg * recipeQuantityKg);
}

export function calculateOptimalRetailPrice(
  totalRealCost: number,
  targetFoodCostPct: number,
): number {
  if (targetFoodCostPct <= 0) {
    throw new WasteError(
      "validation_failed",
      "Target food cost percentage must be greater than zero.",
    );
  }

  return roundMoney(totalRealCost / targetFoodCostPct);
}
