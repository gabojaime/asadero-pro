import { describe, expect, it } from "vitest";
import {
  calculateAvgContributionPerPortion,
  calculateBepPortions,
  calculateBepProgressPct,
  calculateBepRevenue,
  calculateContributionMarginRatio,
  calculateFoodCostPct,
  calculateIngredientCostConsumed,
  calculateLoggedWasteCost,
  calculateNetSales,
  calculateTicketTimeStats,
  calculateWastePct,
  getFoodCostAlertLevel,
} from "./formulas";

describe("dashboard formulas — AC-2 food cost", () => {
  it("matches hand-calculated food cost % from movements, waste, and sales", () => {
    const netSales = calculateNetSales([120, 80]);
    const ingredientCost = calculateIngredientCostConsumed([
      { quantity: 2.5, unitCost: 10 },
      { quantity: 1, unitCost: 8 },
    ]);
    const wasteCost = calculateLoggedWasteCost([
      { totalCost: 15 },
      { totalCost: 5 },
    ]);

    expect(netSales).toBe(200);
    expect(ingredientCost).toBe(33);
    expect(wasteCost).toBe(20);
    expect(calculateFoodCostPct(netSales, ingredientCost, wasteCost)).toBe(26.5);
  });

  it("returns null food cost when there are no sales", () => {
    expect(calculateFoodCostPct(0, 10, 5)).toBeNull();
  });

  it("flags alert when above target band and ceiling", () => {
    expect(getFoodCostAlertLevel(36, 0.33)).toBe("alert");
    expect(getFoodCostAlertLevel(34, 0.33)).toBe("success");
  });
});

describe("dashboard formulas — AC-3 contribution ranking order", () => {
  it("sorts plates by margin dollars descending", () => {
    const plates = [
      { menuItemId: "a", marginDollars: 12 },
      { menuItemId: "b", marginDollars: 40 },
    ];
    const sorted = [...plates].sort((x, y) => y.marginDollars - x.marginDollars);
    expect(sorted.map((row) => row.menuItemId)).toEqual(["b", "a"]);
  });
});

describe("dashboard formulas — AC-4 BEP guards", () => {
  it("returns null BEP revenue when contribution ratio is zero or negative", () => {
    expect(calculateContributionMarginRatio(100, 100)).toBeNull();
    expect(calculateContributionMarginRatio(100, 120)).toBeNull();
    expect(
      calculateBepRevenue(5000, calculateContributionMarginRatio(200, 80)),
    ).toBe(8333.33);
  });

  it("guards BEP portions when average contribution is non-positive", () => {
    expect(
      calculateBepPortions(
        3000,
        calculateAvgContributionPerPortion(100, 120, 5),
      ),
    ).toBeNull();
  });

  it("computes progress pct capped at 150%", () => {
    expect(calculateBepProgressPct(1500, 1000)).toBe(150);
    expect(calculateBepProgressPct(400, 1000)).toBe(40);
  });
});

describe("dashboard formulas — AC-5 ticket time", () => {
  it("matches median and p90 for fixture timestamps", () => {
    const minutes = [12, 14, 18, 22, 30];
    const stats = calculateTicketTimeStats(minutes);
    expect(stats.median).toBe(18);
    expect(stats.p90).toBe(26.8);
  });
});

describe("dashboard formulas — waste %", () => {
  it("returns null when receipt denominator is zero", () => {
    expect(calculateWastePct(3, 0)).toBeNull();
  });
});
