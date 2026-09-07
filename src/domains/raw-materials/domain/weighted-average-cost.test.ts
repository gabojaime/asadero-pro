import { describe, expect, it } from "vitest";
import { RawMaterialError } from "./errors";
import {
  roundMoney,
  roundQuantityForUom,
  updateWeightedAverageCost,
} from "./weighted-average-cost";

describe("roundMoney", () => {
  it("rounds half-up to two decimal places", () => {
    expect(roundMoney(10.125)).toBe(10.13);
    expect(roundMoney(10.124)).toBe(10.12);
    expect(roundMoney(0)).toBe(0);
  });
});

describe("roundQuantityForUom", () => {
  it("rounds to three decimal places for kilogram", () => {
    expect(roundQuantityForUom(1.23456, "kilogram")).toBe(1.235);
  });

  it("rounds to three decimal places for unit (fractional packs allowed)", () => {
    expect(roundQuantityForUom(0.5, "unit")).toBe(0.5);
    expect(roundQuantityForUom(2.3334, "unit")).toBe(2.333);
  });
});

describe("updateWeightedAverageCost", () => {
  it("sets WAC to incoming cost on first receipt", () => {
    const result = updateWeightedAverageCost({
      currentQuantity: 0,
      currentUnitCost: 0,
      incomingQuantity: 10,
      incomingUnitCost: 25.5,
    });

    expect(result).toEqual({
      quantityOnHand: 10,
      unitCost: 25.5,
    });
  });

  it("allows zero-cost first receipt", () => {
    const result = updateWeightedAverageCost({
      currentQuantity: 0,
      currentUnitCost: 0,
      incomingQuantity: 5,
      incomingUnitCost: 0,
    });

    expect(result).toEqual({
      quantityOnHand: 5,
      unitCost: 0,
    });
  });

  it("blends WAC when stock already exists", () => {
    const result = updateWeightedAverageCost({
      currentQuantity: 10,
      currentUnitCost: 20,
      incomingQuantity: 10,
      incomingUnitCost: 30,
    });

    expect(result.quantityOnHand).toBe(20);
    expect(result.unitCost).toBe(25);
  });

  it("adds quantity only when incoming cost is zero with existing stock", () => {
    const result = updateWeightedAverageCost({
      currentQuantity: 10,
      currentUnitCost: 20,
      incomingQuantity: 5,
      incomingUnitCost: 0,
    });

    expect(result).toEqual({
      quantityOnHand: 15,
      unitCost: 20,
    });
  });

  it("rejects zero incoming quantity", () => {
    expect(() =>
      updateWeightedAverageCost({
        currentQuantity: 10,
        currentUnitCost: 20,
        incomingQuantity: 0,
        incomingUnitCost: 5,
      }),
    ).toThrow(RawMaterialError);
  });

  it("rejects negative incoming quantity", () => {
    expect(() =>
      updateWeightedAverageCost({
        currentQuantity: 10,
        currentUnitCost: 20,
        incomingQuantity: -1,
        incomingUnitCost: 5,
      }),
    ).toThrow(RawMaterialError);
  });

  it("rejects negative incoming unit cost", () => {
    expect(() =>
      updateWeightedAverageCost({
        currentQuantity: 0,
        currentUnitCost: 0,
        incomingQuantity: 5,
        incomingUnitCost: -1,
      }),
    ).toThrow(RawMaterialError);
  });

  it("rounds blended WAC to two decimals", () => {
    const result = updateWeightedAverageCost({
      currentQuantity: 3,
      currentUnitCost: 10,
      incomingQuantity: 1,
      incomingUnitCost: 10.333,
    });

    expect(result.quantityOnHand).toBe(4);
    expect(result.unitCost).toBe(10.08);
  });
});
