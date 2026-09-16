import { describe, expect, it } from "vitest";
import { buildMeatPlateCostingRow } from "./build-costing-row";
import { enrichMeatPlateCostingSourceRow } from "./enrich-costing-source-row";

describe("buildMeatPlateCostingRow with inferred recipe", () => {
  it("reaches ready status when recipe is inferred from weight and protein", () => {
    const materials = [{ id: "rm-beef", name: "Carne", unitCost: 10 }];

    const enriched = enrichMeatPlateCostingSourceRow(
      {
        menuItemId: "menu-1",
        name: "Beef 1 kg",
        weightLabel: "1kg",
        proteinGroup: "beef",
        currentPrice: 44,
        rawMaterialId: null,
        rawMaterialName: null,
        unitCost: null,
        recipeQuantityKg: null,
        wastePct: 30,
      },
      materials,
    );

    const row = buildMeatPlateCostingRow(enriched, 0.33);

    expect(row.configurationStatus).toBe("ready");
    expect(row.realIngredientCost).toBeCloseTo(14.29, 2);
    expect(row.recommendedPrice).toBeCloseTo(43.3, 1);
    expect(row.rawMaterialName).toBe("Carne");
    expect(row.recipeQuantityKg).toBe(1);
  });
});
