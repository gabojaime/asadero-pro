import { describe, expect, it } from "vitest";
import { WasteError } from "./errors";
import {
  calculateOptimalRetailPrice,
  calculatePlateRealCost,
  calculateRealCostPerKg,
  calculateYieldPct,
} from "./cost-formulas";

describe("calculateYieldPct", () => {
  it("returns 100 minus waste percentage", () => {
    expect(calculateYieldPct(30)).toBe(70);
    expect(calculateYieldPct(0)).toBe(100);
  });
});

describe("calculateRealCostPerKg", () => {
  it("inflates purchase cost by yield loss (AC-8)", () => {
    expect(calculateRealCostPerKg(10, 30)).toBeCloseTo(14.29, 2);
  });

  it("returns purchase cost when waste is zero", () => {
    expect(calculateRealCostPerKg(10, 0)).toBe(10);
  });

  it("rejects waste at 100 percent", () => {
    expect(() => calculateRealCostPerKg(10, 100)).toThrow(WasteError);
  });
});

describe("calculatePlateRealCost", () => {
  it("multiplies real cost per kg by recipe quantity", () => {
    expect(calculatePlateRealCost(10, 30, 0.5)).toBeCloseTo(7.15, 2);
  });
});

describe("calculateOptimalRetailPrice", () => {
  it("divides total real cost by target food cost ratio (AC-8)", () => {
    const realCost = calculatePlateRealCost(10, 30, 1);
    expect(calculateOptimalRetailPrice(realCost, 0.33)).toBeCloseTo(43.3, 1);
  });

  it("rejects zero target food cost (AC-9)", () => {
    expect(() => calculateOptimalRetailPrice(10, 0)).toThrow(WasteError);
  });
});
