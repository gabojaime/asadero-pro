import type { MeatPlateCostingSourceRow } from "../domain/entities";
import {
  inferRecipeLinkForMeatPlate,
  type InventoryMaterialRef,
} from "../domain/protein-inventory-link";

export function enrichMeatPlateCostingSourceRow(
  source: MeatPlateCostingSourceRow,
  materials: InventoryMaterialRef[],
): MeatPlateCostingSourceRow {
  if (source.rawMaterialId != null && source.recipeQuantityKg != null) {
    return source;
  }

  const inferred = inferRecipeLinkForMeatPlate({
    proteinGroup: source.proteinGroup,
    weightLabel: source.weightLabel,
    materials,
  });

  if (inferred == null) {
    return source;
  }

  return {
    ...source,
    rawMaterialId: source.rawMaterialId ?? inferred.rawMaterialId,
    rawMaterialName: source.rawMaterialName ?? inferred.rawMaterialName,
    unitCost: source.unitCost ?? inferred.unitCost,
    recipeQuantityKg: source.recipeQuantityKg ?? inferred.recipeQuantityKg,
  };
}

export function enrichMeatPlateCostingSourceRows(
  rows: MeatPlateCostingSourceRow[],
  materials: InventoryMaterialRef[],
): MeatPlateCostingSourceRow[] {
  return rows.map((row) => enrichMeatPlateCostingSourceRow(row, materials));
}
