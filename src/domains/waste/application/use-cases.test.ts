import { describe, expect, it } from "vitest";
import type { SessionProfile } from "@/domains/auth/domain/entities";
import type { MeatPlateCostingSourceRow } from "../domain/entities";
import { WasteError } from "../domain/errors";
import type { CostingRepository } from "../domain/repository";
import {
  listMeatPlateCosting,
  updateTargetFoodCostPct,
  updateWastePct,
} from "./use-cases";

const MERCHANT_ID = "11111111-1111-4111-8111-111111111111";
const MENU_ITEM_ID = "22222222-2222-4222-8222-222222222222";

const adminProfile: SessionProfile = {
  userId: "33333333-3333-4333-8333-333333333333",
  email: "admin@test.com",
  merchantId: MERCHANT_ID,
  merchantName: "Test",
  fullName: "Admin",
  role: "admin",
  isOnboarded: true,
};

const waiterProfile: SessionProfile = {
  ...adminProfile,
  role: "waiter",
};

const sourceRow: MeatPlateCostingSourceRow = {
  menuItemId: MENU_ITEM_ID,
  name: "Beef 1 kg",
  weightLabel: "1kg",
  proteinGroup: "beef",
  currentPrice: 44,
  rawMaterialId: "44444444-4444-4444-8444-444444444444",
  rawMaterialName: "Carne",
  unitCost: 10,
  recipeQuantityKg: 1,
  wastePct: 30,
};

function createFakeCostingRepo(
  overrides: Partial<CostingRepository> = {},
): CostingRepository {
  let targetFoodCostPct = 0.33;
  let wastePct = sourceRow.wastePct;

  return {
    async listMeatPlateCosting() {
      return {
        targetFoodCostPct,
        rows: [{ ...sourceRow, wastePct }],
      };
    },
    async listProteinInventoryMaterials() {
      return [
        {
          id: sourceRow.rawMaterialId!,
          name: sourceRow.rawMaterialName!,
          unitCost: sourceRow.unitCost!,
        },
      ];
    },
    async upsertWastePct(params) {
      if (params.wastePct === 25) {
        wastePct = 25;
      } else {
        wastePct = params.wastePct;
      }
    },
    async ensureInferredRecipeIngredient() {},
    async updateTargetFoodCostPct(params) {
      targetFoodCostPct = params.targetFoodCostPct;
      return targetFoodCostPct;
    },
    ...overrides,
  };
}

describe("listMeatPlateCosting", () => {
  it("rejects non-admin actors", async () => {
    await expect(
      listMeatPlateCosting(waiterProfile, createFakeCostingRepo()),
    ).rejects.toThrow(WasteError);
  });

  it("builds costing snapshot math for admin", async () => {
    const snapshot = await listMeatPlateCosting(
      adminProfile,
      createFakeCostingRepo(),
    );

    expect(snapshot.targetFoodCostPct).toBe(0.33);
    expect(snapshot.rows[0]?.realIngredientCost).toBeCloseTo(14.29, 2);
    expect(snapshot.rows[0]?.recommendedPrice).toBeCloseTo(43.3, 1);
    expect(snapshot.rows[0]?.configurationStatus).toBe("ready");
  });

  it("infers recipe from weight label and protein when recipe_ingredients is missing", async () => {
    const repo = createFakeCostingRepo({
      async listMeatPlateCosting() {
        return {
          targetFoodCostPct: 0.33,
          rows: [
            {
              ...sourceRow,
              rawMaterialId: null,
              rawMaterialName: null,
              unitCost: null,
              recipeQuantityKg: null,
            },
          ],
        };
      },
      async listProteinInventoryMaterials() {
        return [{ id: "rm-beef", name: "Carne", unitCost: 10 }];
      },
    });

    const snapshot = await listMeatPlateCosting(adminProfile, repo);

    expect(snapshot.rows[0]?.configurationStatus).toBe("ready");
    expect(snapshot.rows[0]?.rawMaterialName).toBe("Carne");
    expect(snapshot.rows[0]?.recipeQuantityKg).toBe(1);
  });
});

describe("updateWastePct", () => {
  it("upserts waste pct and returns refreshed snapshot", async () => {
    const repo = createFakeCostingRepo();
    const snapshot = await updateWastePct(
      { menuItemId: MENU_ITEM_ID, wastePct: 25 },
      adminProfile,
      repo,
    );

    expect(snapshot.rows[0]?.wastePct).toBe(25);
    expect(snapshot.rows[0]?.realIngredientCost).toBeCloseTo(13.33, 2);
  });

  it("rejects non-admin mutation", async () => {
    await expect(
      updateWastePct(
        { menuItemId: MENU_ITEM_ID, wastePct: 20 },
        waiterProfile,
        createFakeCostingRepo(),
      ),
    ).rejects.toThrow(WasteError);
  });
});

describe("updateTargetFoodCostPct", () => {
  it("updates target food cost and refreshes recommendations", async () => {
    const snapshot = await updateTargetFoodCostPct(
      { targetFoodCostPct: 0.35 },
      adminProfile,
      createFakeCostingRepo(),
    );

    expect(snapshot.targetFoodCostPct).toBe(0.35);
    expect(snapshot.rows[0]?.recommendedPrice).toBeCloseTo(40.83, 2);
  });
});
