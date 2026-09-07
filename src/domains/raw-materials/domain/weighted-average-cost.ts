import { RawMaterialError } from "./errors";
import type { UnitOfMeasure } from "./entities";

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function roundQuantityForUom(
  value: number,
  uom: UnitOfMeasure,
): number {
  void uom;
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

export type WeightedAverageCostResult = {
  quantityOnHand: number;
  unitCost: number;
};

export function updateWeightedAverageCost(params: {
  currentQuantity: number;
  currentUnitCost: number;
  incomingQuantity: number;
  incomingUnitCost: number;
}): WeightedAverageCostResult {
  const {
    currentQuantity,
    currentUnitCost,
    incomingQuantity,
    incomingUnitCost,
  } = params;

  if (incomingQuantity <= 0) {
    throw new RawMaterialError(
      "validation_failed",
      "Incoming quantity must be greater than zero.",
    );
  }

  if (incomingUnitCost < 0) {
    throw new RawMaterialError(
      "validation_failed",
      "Incoming unit cost cannot be negative.",
    );
  }

  const newQuantity = roundQuantityForUom(
    currentQuantity + incomingQuantity,
    "kilogram",
  );

  if (currentQuantity === 0) {
    return {
      quantityOnHand: newQuantity,
      unitCost: roundMoney(incomingUnitCost),
    };
  }

  if (incomingUnitCost === 0) {
    return {
      quantityOnHand: newQuantity,
      unitCost: roundMoney(currentUnitCost),
    };
  }

  const blendedUnitCost =
    (currentQuantity * currentUnitCost +
      incomingQuantity * incomingUnitCost) /
    newQuantity;

  return {
    quantityOnHand: newQuantity,
    unitCost: roundMoney(blendedUnitCost),
  };
}
