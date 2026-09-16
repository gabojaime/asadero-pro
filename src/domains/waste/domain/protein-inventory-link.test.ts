import { describe, expect, it } from "vitest";
import {
  findInventoryMaterialForProteinGroup,
  inferRecipeLinkForMeatPlate,
  proteinGroupToInventoryName,
} from "./protein-inventory-link";

const materials = [
  { id: "rm-beef", name: "Carne", unitCost: 10 },
  { id: "rm-chicken", name: "Pollo", unitCost: 8 },
  { id: "rm-pork", name: "Cochino", unitCost: 9 },
  { id: "rm-yuca", name: "Yuca", unitCost: 2 },
];

describe("proteinGroupToInventoryName", () => {
  it("maps protein groups to dev seed insumo names", () => {
    expect(proteinGroupToInventoryName("beef")).toBe("carne");
    expect(proteinGroupToInventoryName("pork")).toBe("cochino");
    expect(proteinGroupToInventoryName("chicken")).toBe("pollo");
  });
});

describe("findInventoryMaterialForProteinGroup", () => {
  it("resolves materials case-insensitively", () => {
    expect(
      findInventoryMaterialForProteinGroup("beef", materials)?.id,
    ).toBe("rm-beef");
    expect(
      findInventoryMaterialForProteinGroup("chicken", [
        { id: "x", name: "  pollo  ", unitCost: 1 },
      ])?.id,
    ).toBe("x");
  });

  it("returns null when protein group or material is missing", () => {
    expect(findInventoryMaterialForProteinGroup(null, materials)).toBeNull();
    expect(findInventoryMaterialForProteinGroup("beef", [])).toBeNull();
  });
});

describe("inferRecipeLinkForMeatPlate", () => {
  it("combines weight label kg with protein insumo", () => {
    const link = inferRecipeLinkForMeatPlate({
      proteinGroup: "beef",
      weightLabel: "500g",
      materials,
    });

    expect(link).toEqual({
      rawMaterialId: "rm-beef",
      rawMaterialName: "Carne",
      unitCost: 10,
      recipeQuantityKg: 0.5,
    });
  });

  it("infers recipe quantity for custom gram portions", () => {
    const link = inferRecipeLinkForMeatPlate({
      proteinGroup: "beef",
      weightLabel: "300g",
      materials,
    });

    expect(link?.recipeQuantityKg).toBe(0.3);
    expect(link?.rawMaterialId).toBe("rm-beef");
  });

  it("returns null when weight label or protein cannot be resolved", () => {
    expect(
      inferRecipeLinkForMeatPlate({
        proteinGroup: "beef",
        weightLabel: "300",
        materials,
      }),
    ).toBeNull();

    expect(
      inferRecipeLinkForMeatPlate({
        proteinGroup: null,
        weightLabel: "1kg",
        materials,
      }),
    ).toBeNull();
  });
});
