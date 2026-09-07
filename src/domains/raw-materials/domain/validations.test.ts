import { describe, expect, it } from "vitest";
import {
  parseCreateRawMaterialInput,
  parseReceiveStockInput,
  parseUpdateRawMaterialInput,
  validateQuantityForUom,
} from "./validations";

describe("validateQuantityForUom", () => {
  it("allows kilogram quantities with up to 3 decimal digits", () => {
    expect(validateQuantityForUom(1.234, "kilogram")).toBe(true);
    expect(validateQuantityForUom(0, "kilogram")).toBe(true);
  });

  it("allows fractional unit quantities such as 0.5", () => {
    expect(validateQuantityForUom(0.5, "unit")).toBe(true);
    expect(validateQuantityForUom(2.001, "unit")).toBe(true);
  });

  it("rejects more than 3 fractional digits for both UoM", () => {
    expect(validateQuantityForUom(1.2345, "kilogram")).toBe(false);
    expect(validateQuantityForUom(0.0001, "unit")).toBe(false);
  });

  it("rejects negative quantities", () => {
    expect(validateQuantityForUom(-0.5, "unit")).toBe(false);
  });
});

describe("parseCreateRawMaterialInput", () => {
  it("trims name and sku", () => {
    const result = parseCreateRawMaterialInput({
      name: "  Carne  ",
      sku: "  SKU-1  ",
      unitOfMeasure: "kilogram",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Carne");
      expect(result.data.sku).toBe("SKU-1");
    }
  });

  it("converts blank sku to null", () => {
    const result = parseCreateRawMaterialInput({
      name: "Carne",
      sku: "   ",
      unitOfMeasure: "unit",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sku).toBeNull();
    }
  });

  it("rejects empty name", () => {
    const result = parseCreateRawMaterialInput({
      name: "   ",
      unitOfMeasure: "kilogram",
    });

    expect(result.success).toBe(false);
  });
});

describe("parseUpdateRawMaterialInput", () => {
  it("validates update fields", () => {
    const result = parseUpdateRawMaterialInput({
      name: "Pollo",
      sku: null,
    });

    expect(result.success).toBe(true);
  });
});

describe("parseReceiveStockInput", () => {
  it("accepts fractional unit receipt quantity", () => {
    const result = parseReceiveStockInput({
      incomingQuantity: 0.5,
      incomingUnitCost: 12.5,
    });

    expect(result.success).toBe(true);
  });

  it("rejects zero incoming quantity", () => {
    const result = parseReceiveStockInput({
      incomingQuantity: 0,
      incomingUnitCost: 10,
    });

    expect(result.success).toBe(false);
  });

  it("rejects negative incoming unit cost", () => {
    const result = parseReceiveStockInput({
      incomingQuantity: 1,
      incomingUnitCost: -1,
    });

    expect(result.success).toBe(false);
  });

  it("rejects incoming quantity with more than 3 decimals", () => {
    const result = parseReceiveStockInput({
      incomingQuantity: 1.2345,
      incomingUnitCost: 10,
    });

    expect(result.success).toBe(false);
  });
});
