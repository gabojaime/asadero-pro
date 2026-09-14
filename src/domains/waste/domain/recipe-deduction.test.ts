import { describe, expect, it } from "vitest";
import { aggregateRecipeDeductions } from "./recipe-deduction";

const BEEF_HALF_ID = "22222222-2222-4222-8222-222222222222";
const CARNE_ID = "33333333-3333-4333-8333-333333333333";
const DRINK_ID = "44444444-4444-4444-8444-444444444444";

describe("aggregateRecipeDeductions", () => {
  it("aggregates recipe quantity by raw material without merma adjustment (AC-17)", () => {
    const result = aggregateRecipeDeductions(
      [
        { menuItemId: BEEF_HALF_ID, quantity: 1 },
        { menuItemId: BEEF_HALF_ID, quantity: 1 },
      ],
      [
        {
          menuItemId: BEEF_HALF_ID,
          rawMaterialId: CARNE_ID,
          quantityKg: 0.5,
        },
      ],
    );

    expect(result).toEqual([{ rawMaterialId: CARNE_ID, totalKg: 1 }]);
  });

  it("skips lines without recipe links", () => {
    const result = aggregateRecipeDeductions(
      [
        { menuItemId: BEEF_HALF_ID, quantity: 2 },
        { menuItemId: DRINK_ID, quantity: 3 },
      ],
      [
        {
          menuItemId: BEEF_HALF_ID,
          rawMaterialId: CARNE_ID,
          quantityKg: 0.5,
        },
      ],
    );

    expect(result).toEqual([{ rawMaterialId: CARNE_ID, totalKg: 1 }]);
  });

  it("multiplies recipe quantity by line quantity", () => {
    const result = aggregateRecipeDeductions(
      [{ menuItemId: BEEF_HALF_ID, quantity: 3 }],
      [
        {
          menuItemId: BEEF_HALF_ID,
          rawMaterialId: CARNE_ID,
          quantityKg: 0.5,
        },
      ],
    );

    expect(result).toEqual([{ rawMaterialId: CARNE_ID, totalKg: 1.5 }]);
  });
});
