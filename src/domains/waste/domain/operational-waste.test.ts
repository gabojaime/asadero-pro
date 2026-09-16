import { describe, expect, it } from "vitest";
import {
  calculateWasteLogTotalCost,
  validateOperationalWasteInput,
  WASTE_REASON_LABELS_ES,
} from "./operational-waste";

describe("calculateWasteLogTotalCost", () => {
  it("rounds product to two decimal places half-up", () => {
    expect(calculateWasteLogTotalCost(0.333, 10.0)).toBe(3.33);
    expect(calculateWasteLogTotalCost(0.005, 10.0)).toBe(0.05);
  });

  it("rejects zero or negative weight", () => {
    expect(() => calculateWasteLogTotalCost(0, 5)).toThrow();
    expect(() => calculateWasteLogTotalCost(-1, 5)).toThrow();
  });
});

describe("validateOperationalWasteInput", () => {
  const valid = {
    rawMaterialId: "550e8400-e29b-41d4-a716-446655440000",
    weightKg: 0.35,
    reason: "burned_on_grill" as const,
  };

  it("accepts valid input", () => {
    const result = validateOperationalWasteInput(valid);
    expect(result.success).toBe(true);
  });

  it("rejects zero weight", () => {
    const result = validateOperationalWasteInput({ ...valid, weightKg: 0 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors.weightKg).toBeDefined();
    }
  });

  it("rejects missing reason", () => {
    const result = validateOperationalWasteInput({
      ...valid,
      reason: "invalid_reason",
    });
    expect(result.success).toBe(false);
  });

  it("exposes Spanish labels for all reasons", () => {
    expect(Object.keys(WASTE_REASON_LABELS_ES)).toHaveLength(4);
  });
});
