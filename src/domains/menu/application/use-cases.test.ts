import { describe, expect, it, vi } from "vitest";
import type { SessionProfile } from "@/domains/auth/domain/entities";
import type { MenuItem } from "../domain/entities";
import type { MenuItemRepository } from "../domain/repository";
import {
  assertItemKindImmutable,
  createMenuItem,
  deactivateMenuItem,
  listMenuItems,
  reactivateMenuItem,
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
