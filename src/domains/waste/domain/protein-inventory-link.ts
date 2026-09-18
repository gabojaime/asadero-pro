import type { ProteinGroup } from "@/domains/orders/domain/entities";
import { parseWeightLabelToKg } from "./weight-label";

export type InventoryMaterialRef = {
  id: string;
  name: string;
  unitCost: number;
};

export type InferredRecipeLink = {
  rawMaterialId: string;
  rawMaterialName: string;
  unitCost: number;
  recipeQuantityKg: number;
};

/** Dev seed / MVP protein insumo names (case-insensitive match). */
export function proteinGroupToInventoryName(
  proteinGroup: ProteinGroup,
): string {
  switch (proteinGroup) {
    case "beef":
      return "carne";
    case "pork":
      return "cochino";
    case "chicken":
      return "pollo";
  }
}

export function findInventoryMaterialForProteinGroup(
  proteinGroup: ProteinGroup | null,
  materials: InventoryMaterialRef[],
): InventoryMaterialRef | null {
  if (proteinGroup == null) {
    return null;
  }

  const targetName = proteinGroupToInventoryName(proteinGroup);

  return (
    materials.find(
      (material) => material.name.trim().toLowerCase() === targetName,
    ) ?? null
  );
}

export type ProteinInsumoAvailability = {
  beef: boolean;
  pork: boolean;
  chicken: boolean;
};

export function buildProteinInsumoAvailability(
  materials: InventoryMaterialRef[],
): ProteinInsumoAvailability {
  return {
    beef: findInventoryMaterialForProteinGroup("beef", materials) != null,
    pork: findInventoryMaterialForProteinGroup("pork", materials) != null,
    chicken:
      findInventoryMaterialForProteinGroup("chicken", materials) != null,
  };
}

export function inferRecipeLinkForMeatPlate(params: {
  proteinGroup: ProteinGroup | null;
  weightLabel: string | null;
  materials: InventoryMaterialRef[];
}): InferredRecipeLink | null {
  const recipeQuantityKg = parseWeightLabelToKg(params.weightLabel);
  if (recipeQuantityKg == null) {
    return null;
  }

  const material = findInventoryMaterialForProteinGroup(
    params.proteinGroup,
    params.materials,
  );
  if (material == null) {
    return null;
  }

  return {
    rawMaterialId: material.id,
    rawMaterialName: material.name,
    unitCost: material.unitCost,
    recipeQuantityKg,
  };
}
