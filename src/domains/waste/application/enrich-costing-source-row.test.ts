import { describe, expect, it } from "vitest";
import type { MeatPlateCostingSourceRow } from "../domain/entities";
import { enrichMeatPlateCostingSourceRow } from "./enrich-costing-source-row";

const materials = [
  { id: "rm-beef", name: "Carne", unitCost: 10 },
  { id: "rm-chicken", name: "Pollo", unitCost: 8 },
];

const baseRow: MeatPlateCostingSourceRow = {
  menuItemId: "menu-1",
  name: "Beef 500g",
  weightLabel: "500g",
  proteinGroup: "beef",
  currentPrice: 20,
  rawMaterialId: null,
  rawMaterialName: null,
  unitCost: null,
  recipeQuantityKg: null,
  wastePct: 30,
};

describe("enrichMeatPlateCostingSourceRow", () => {
  it("fills missing recipe fields from protein group and weight label", () => {
    const enriched = enrichMeatPlateCostingSourceRow(baseRow, materials);

    expect(enriched.rawMaterialId).toBe("rm-beef");
    expect(enriched.rawMaterialName).toBe("Carne");
    expect(enriched.unitCost).toBe(10);
    expect(enriched.recipeQuantityKg).toBe(0.5);
  });

  it("infers 300g portions as 0.3 kg recipe quantity", () => {
    const enriched = enrichMeatPlateCostingSourceRow(
      { ...baseRow, weightLabel: "300g" },
      materials,
    );

    expect(enriched.recipeQuantityKg).toBe(0.3);
  });

  it("does not override an existing recipe link from the database", () => {
    const withRecipe: MeatPlateCostingSourceRow = {
      ...baseRow,
      rawMaterialId: "db-material",
      rawMaterialName: "Carne",
      unitCost: 12,
      recipeQuantityKg: 0.5,
    };

    expect(enrichMeatPlateCostingSourceRow(withRecipe, materials)).toEqual(
      withRecipe,
    );
  });
});
