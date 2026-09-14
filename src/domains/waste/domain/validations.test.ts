import { describe, expect, it } from "vitest";
import {
  parseUpdateTargetFoodCostPctInput,
  parseUpdateWastePctInput,
} from "./validations";

describe("parseUpdateWastePctInput", () => {
  it("accepts valid waste percentages", () => {
    const result = parseUpdateWastePctInput({
      menuItemId: "11111111-1111-4111-8111-111111111111",
      wastePct: 30,
    });

    expect(result.success).toBe(true);
  });

  it("rejects 100, above 100, and negative values (AC-9)", () => {
    expect(
      parseUpdateWastePctInput({
        menuItemId: "11111111-1111-4111-8111-111111111111",
        wastePct: 100,
      }).success,
    ).toBe(false);

    expect(
      parseUpdateWastePctInput({
        menuItemId: "11111111-1111-4111-8111-111111111111",
        wastePct: 100.01,
      }).success,
    ).toBe(false);

    expect(
      parseUpdateWastePctInput({
        menuItemId: "11111111-1111-4111-8111-111111111111",
        wastePct: -1,
      }).success,
    ).toBe(false);
  });
});

describe("parseUpdateTargetFoodCostPctInput", () => {
  it("accepts valid target food cost ratios", () => {
    const result = parseUpdateTargetFoodCostPctInput({
      targetFoodCostPct: 0.33,
    });

    expect(result.success).toBe(true);
  });

  it("rejects zero target food cost (AC-9)", () => {
    expect(
      parseUpdateTargetFoodCostPctInput({ targetFoodCostPct: 0 }).success,
    ).toBe(false);
  });
});
