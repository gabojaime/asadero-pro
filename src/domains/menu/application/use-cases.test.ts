import { describe, expect, it, vi } from "vitest";
import type { SessionProfile } from "@/domains/auth/domain/entities";
import type { MenuItem } from "../domain/entities";
import type { MenuItemRepository } from "../domain/repository";
import type { CostingRepository } from "@/domains/waste/domain/repository";
import {
  STARTER_MENU_ITEMS,
  normalizeMenuItemName,
} from "../domain/starter-catalog";
import type { CreateMenuItemPayload } from "../domain/repository";
import {
  assertItemKindImmutable,
  createMenuItem,
  deactivateMenuItem,
  listMenuItems,
  reactivateMenuItem,
  seedStarterMenuCatalog,
  updateMenuItem,
} from "./use-cases";

const adminProfile: SessionProfile = {
  userId: "admin-1",
  email: "admin@test.com",
  merchantId: "merchant-1",
  merchantName: "Test Asadero",
  fullName: "Admin User",
  role: "admin",
  isOnboarded: true,
};

const waiterProfile: SessionProfile = {
  ...adminProfile,
  userId: "waiter-1",
  role: "waiter",
};

const baseItem: MenuItem = {
  id: "item-1",
  merchantId: "merchant-1",
  name: "Costilla",
  price: 13,
  itemKind: "meat_plate",
  proteinGroup: "pork",
  weightLabel: "1kg",
  isActive: true,
  createdAt: new Date("2026-01-01T00:00:00Z"),
};

function createRepository(
  overrides: Partial<MenuItemRepository> = {},
): MenuItemRepository {
  return {
    listByMerchant: vi.fn().mockResolvedValue([baseItem]),
    getById: vi.fn().mockResolvedValue(baseItem),
    create: vi.fn().mockResolvedValue(baseItem),
    createMany: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue(baseItem),
    setActive: vi.fn().mockResolvedValue({ ...baseItem, isActive: false }),
    ...overrides,
  };
}

describe("listMenuItems", () => {
  it("rejects non-admin actors", async () => {
    const repository = createRepository();

    await expect(
      listMenuItems(waiterProfile, { activeOnly: true }, repository),
    ).rejects.toMatchObject({ code: "forbidden" });

    expect(repository.listByMerchant).not.toHaveBeenCalled();
  });

  it("sorts by kind then name", async () => {
    const repository = createRepository({
      listByMerchant: vi.fn().mockResolvedValue([
        { ...baseItem, id: "d", name: "Zumo", itemKind: "drink" },
        { ...baseItem, id: "m", name: "Zanahoria", itemKind: "side" },
        { ...baseItem, id: "a", name: "Carne", itemKind: "meat_plate" },
      ]),
    });

    const result = await listMenuItems(
      adminProfile,
      { activeOnly: false },
      repository,
    );

    expect(result.map((item) => item.id)).toEqual(["a", "d", "m"]);
  });
});

describe("createMenuItem", () => {
  it("rejects non-admin", async () => {
    const repository = createRepository();

    await expect(
      createMenuItem(
        {
          name: "Agua",
          price: 1,
          itemKind: "drink",
          proteinGroup: null,
          weightLabel: null,
        },
        waiterProfile,
        repository,
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
  });
});

describe("updateMenuItem", () => {
  it("uses existing kind for validation", async () => {
    const repository = createRepository({
      getById: vi.fn().mockResolvedValue({
        ...baseItem,
        itemKind: "meat_plate",
      }),
      update: vi.fn().mockResolvedValue(baseItem),
    });

    await updateMenuItem(
      "item-1",
      {
        name: "Costilla premium",
        price: 14,
        proteinGroup: "pork",
        weightLabel: "1kg",
      },
      adminProfile,
      repository,
    );

    expect(repository.update).toHaveBeenCalled();
  });

  it("rejects update when item belongs to another merchant", async () => {
    const repository = createRepository({
      getById: vi.fn().mockResolvedValue({
        ...baseItem,
        merchantId: "other-merchant",
      }),
    });

    await expect(
      updateMenuItem(
        "item-1",
        {
          name: "X",
          price: 1,
          proteinGroup: null,
          weightLabel: null,
        },
        adminProfile,
        repository,
      ),
    ).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("deactivateMenuItem and reactivateMenuItem", () => {
  it("deactivates via setActive false", async () => {
    const repository = createRepository({
      setActive: vi.fn().mockResolvedValue({ ...baseItem, isActive: false }),
    });

    const result = await deactivateMenuItem("item-1", adminProfile, repository);

    expect(repository.setActive).toHaveBeenCalledWith("item-1", false);
    expect(result.isActive).toBe(false);
  });

  it("reactivates via setActive true", async () => {
    const repository = createRepository({
      getById: vi.fn().mockResolvedValue({ ...baseItem, isActive: false }),
      setActive: vi.fn().mockResolvedValue({ ...baseItem, isActive: true }),
    });

    const result = await reactivateMenuItem("item-1", adminProfile, repository);

    expect(repository.setActive).toHaveBeenCalledWith("item-1", true);
    expect(result.isActive).toBe(true);
  });
});

function createCostingRepository(
  overrides: Partial<CostingRepository> = {},
): CostingRepository {
  return {
    listMeatPlateCosting: vi.fn(),
    listProteinInventoryMaterials: vi.fn().mockResolvedValue([]),
    upsertWastePct: vi.fn(),
    ensureInferredRecipeIngredient: vi.fn().mockResolvedValue(false),
    ensureDefaultWastePctIfMissing: vi.fn().mockResolvedValue(false),
    updateTargetFoodCostPct: vi.fn(),
    ...overrides,
  };
}

describe("seedStarterMenuCatalog", () => {
  it("rejects non-admin users", async () => {
    const menuRepository = createRepository({
      listByMerchant: vi.fn().mockResolvedValue([]),
    });
    const costingRepository = createCostingRepository();

    await expect(
      seedStarterMenuCatalog(waiterProfile, menuRepository, costingRepository),
    ).rejects.toMatchObject({ code: "forbidden" });

    expect(menuRepository.listByMerchant).not.toHaveBeenCalled();
  });

  it("inserts all starter items when catalog is empty", async () => {
    const createdItems = STARTER_MENU_ITEMS.map((item, index) => ({
      ...baseItem,
      id: `item-${index}`,
      name: item.name,
      itemKind: item.itemKind,
      proteinGroup: item.proteinGroup,
      weightLabel: item.weightLabel,
      price: item.price,
    }));

    const menuRepository = createRepository({
      listByMerchant: vi.fn().mockResolvedValue([]),
      createMany: vi.fn().mockResolvedValue(createdItems),
    });
    const costingRepository = createCostingRepository();

    const result = await seedStarterMenuCatalog(
      adminProfile,
      menuRepository,
      costingRepository,
    );

    expect(result.insertedCount).toBe(STARTER_MENU_ITEMS.length);
    expect(result.skippedCount).toBe(0);
    expect(menuRepository.createMany).toHaveBeenCalledWith(
      STARTER_MENU_ITEMS.map((item) => ({
        name: item.name,
        price: item.price,
        itemKind: item.itemKind,
        proteinGroup: item.proteinGroup,
        weightLabel: item.weightLabel,
        merchantId: "merchant-1",
      })),
    );
    expect(costingRepository.ensureInferredRecipeIngredient).toHaveBeenCalledTimes(
      9,
    );
    expect(result.recipesSkippedCount).toBe(9);
  });

  it("skips all definitions when names already exist", async () => {
    const menuRepository = createRepository({
      listByMerchant: vi.fn().mockResolvedValue(
        STARTER_MENU_ITEMS.map((item, index) => ({
          ...baseItem,
          id: `existing-${index}`,
          name: item.name,
        })),
      ),
    });
    const costingRepository = createCostingRepository();

    const result = await seedStarterMenuCatalog(
      adminProfile,
      menuRepository,
      costingRepository,
    );

    expect(result.insertedCount).toBe(0);
    expect(result.skippedCount).toBe(STARTER_MENU_ITEMS.length);
    expect(menuRepository.createMany).not.toHaveBeenCalled();
  });

  it("attaches recipes and costing when protein materials exist", async () => {
    const meatPlates = STARTER_MENU_ITEMS.filter(
      (item) => item.itemKind === "meat_plate",
    );
    const createdItems = meatPlates.map((item, index) => ({
      ...baseItem,
      id: `meat-${index}`,
      name: item.name,
      itemKind: item.itemKind as typeof baseItem.itemKind,
      proteinGroup: item.proteinGroup,
      weightLabel: item.weightLabel,
      price: item.price,
    }));

    const menuRepository = createRepository({
      listByMerchant: vi.fn().mockResolvedValue([]),
      createMany: vi.fn().mockResolvedValue(createdItems),
    });

    const materials = [
      { id: "rm-beef", name: "Carne", unitCost: 10 },
      { id: "rm-pork", name: "Cochino", unitCost: 9 },
      { id: "rm-chicken", name: "Pollo", unitCost: 8 },
    ];

    const ensureRecipe = vi.fn().mockResolvedValue(true);
    const ensureCosting = vi.fn().mockResolvedValue(true);

    const costingRepository = createCostingRepository({
      listProteinInventoryMaterials: vi.fn().mockResolvedValue(materials),
      ensureInferredRecipeIngredient: ensureRecipe,
      ensureDefaultWastePctIfMissing: ensureCosting,
    });

    const result = await seedStarterMenuCatalog(
      adminProfile,
      menuRepository,
      costingRepository,
    );

    expect(result.recipesAttachedCount).toBe(meatPlates.length);
    expect(result.costingAttachedCount).toBe(meatPlates.length);
    expect(result.recipesSkippedCount).toBe(0);
    expect(result.missingProteinGroups).toEqual([]);
    expect(ensureRecipe).toHaveBeenCalledTimes(meatPlates.length);
    expect(ensureCosting).toHaveBeenCalledTimes(meatPlates.length);
  });

  it("loads menu only when no protein materials exist", async () => {
    const createdItems = STARTER_MENU_ITEMS.map((item, index) => ({
      ...baseItem,
      id: `item-${index}`,
      name: item.name,
      itemKind: item.itemKind,
      proteinGroup: item.proteinGroup,
      weightLabel: item.weightLabel,
      price: item.price,
    }));

    const menuRepository = createRepository({
      listByMerchant: vi.fn().mockResolvedValue([]),
      createMany: vi.fn().mockResolvedValue(createdItems),
    });
    const costingRepository = createCostingRepository({
      listProteinInventoryMaterials: vi.fn().mockResolvedValue([]),
    });

    const result = await seedStarterMenuCatalog(
      adminProfile,
      menuRepository,
      costingRepository,
    );

    expect(result.insertedCount).toBe(STARTER_MENU_ITEMS.length);
    expect(result.recipesAttachedCount).toBe(0);
    expect(result.recipesSkippedCount).toBe(9);
    expect(result.missingProteinGroups.sort()).toEqual([
      "beef",
      "chicken",
      "pork",
    ]);
  });

  it("partially attaches when only some proteins exist", async () => {
    const menuRepository = createRepository({
      listByMerchant: vi.fn().mockResolvedValue([]),
      createMany: vi.fn().mockImplementation(
        async (inputs: CreateMenuItemPayload[]) =>
          inputs.map((input, index) => ({
            ...baseItem,
            id: `new-${index}`,
            name: input.name,
            itemKind: input.itemKind,
            proteinGroup: input.proteinGroup,
            weightLabel: input.weightLabel,
            price: input.price,
          })),
      ),
    });

    const costingRepository = createCostingRepository({
      listProteinInventoryMaterials: vi.fn().mockResolvedValue([
        { id: "rm-beef", name: "Carne", unitCost: 10 },
      ]),
      ensureInferredRecipeIngredient: vi.fn().mockResolvedValue(true),
      ensureDefaultWastePctIfMissing: vi.fn().mockResolvedValue(true),
    });

    const result = await seedStarterMenuCatalog(
      adminProfile,
      menuRepository,
      costingRepository,
    );

    expect(result.recipesAttachedCount).toBe(3);
    expect(result.missingProteinGroups.sort()).toEqual(["chicken", "pork"]);
  });

  it("does not call recipe helpers for drinks and sides", async () => {
    const drinkSideOnly = STARTER_MENU_ITEMS.filter(
      (item) => item.itemKind !== "meat_plate",
    );
    const createdItems = drinkSideOnly.map((item, index) => ({
      ...baseItem,
      id: `ds-${index}`,
      name: item.name,
      itemKind: item.itemKind,
      proteinGroup: item.proteinGroup,
      weightLabel: item.weightLabel,
      price: item.price,
    }));

    const menuRepository = createRepository({
      listByMerchant: vi.fn().mockResolvedValue(
        STARTER_MENU_ITEMS.filter((item) => item.itemKind === "meat_plate").map(
          (item, index) => ({
            ...baseItem,
            id: `existing-meat-${index}`,
            name: item.name,
            itemKind: item.itemKind,
            proteinGroup: item.proteinGroup,
            weightLabel: item.weightLabel,
          }),
        ),
      ),
      createMany: vi.fn().mockResolvedValue(createdItems),
    });

    const ensureRecipe = vi.fn().mockResolvedValue(true);
    const costingRepository = createCostingRepository({
      ensureInferredRecipeIngredient: ensureRecipe,
    });

    await seedStarterMenuCatalog(
      adminProfile,
      menuRepository,
      costingRepository,
    );

    expect(ensureRecipe).not.toHaveBeenCalled();
    expect(
      vi.mocked(menuRepository.createMany).mock.calls[0][0].every(
        (row) => row.itemKind !== "meat_plate",
      ),
    ).toBe(true);
  });

  it("matches existing names case-insensitively", async () => {
    const menuRepository = createRepository({
      listByMerchant: vi.fn().mockResolvedValue([
        {
          ...baseItem,
          name: "  beef 1 kg  ",
        },
      ]),
      createMany: vi.fn().mockImplementation(
        async (inputs: CreateMenuItemPayload[]) =>
          inputs.map((input, index) => ({
            ...baseItem,
            id: `new-${index}`,
            name: input.name,
          })),
      ),
    });
    const costingRepository = createCostingRepository();

    const result = await seedStarterMenuCatalog(
      adminProfile,
      menuRepository,
      costingRepository,
    );

    expect(result.skippedCount).toBeGreaterThanOrEqual(1);
    const payload = vi.mocked(menuRepository.createMany).mock.calls[0]?.[0];
    expect(
      payload?.some(
        (row) => normalizeMenuItemName(row.name) === normalizeMenuItemName("Beef 1 kg"),
      ),
    ).toBe(false);
  });
});

describe("assertItemKindImmutable", () => {
  it("throws when kind changes", () => {
    expect(() =>
      assertItemKindImmutable("drink", "meat_plate"),
    ).toThrow(expect.objectContaining({ code: "kind_immutable" }));
  });

  it("allows undefined requested kind", () => {
    expect(() => assertItemKindImmutable("drink", undefined)).not.toThrow();
  });
});
