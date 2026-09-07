import { describe, expect, it, vi } from "vitest";
import type { SessionProfile } from "@/domains/auth/domain/entities";
import type { RawMaterial } from "../domain/entities";
import type { RawMaterialRepository } from "../domain/repository";
import {
  createRawMaterial,
  deactivateRawMaterial,
  listRawMaterials,
  receiveStock,
  updateRawMaterial,
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

const grillMasterProfile: SessionProfile = {
  ...adminProfile,
  userId: "grill-1",
  role: "grill_master",
};

const baseMaterial: RawMaterial = {
  id: "material-1",
  merchantId: "merchant-1",
  name: "Cubito",
  sku: null,
  unitOfMeasure: "unit",
  quantityOnHand: 0,
  unitCost: 0,
  isActive: true,
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

function createRepository(
  overrides: Partial<RawMaterialRepository> = {},
): RawMaterialRepository {
  return {
    listByMerchant: vi.fn().mockResolvedValue([baseMaterial]),
    getById: vi.fn().mockResolvedValue(baseMaterial),
    create: vi.fn().mockResolvedValue(baseMaterial),
    update: vi.fn().mockResolvedValue(baseMaterial),
    deactivate: vi.fn().mockResolvedValue({ ...baseMaterial, isActive: false }),
    applyReceipt: vi.fn().mockResolvedValue({
      ...baseMaterial,
      quantityOnHand: 0.5,
      unitCost: 12.5,
    }),
    listMovements: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

describe("listRawMaterials", () => {
  it("rejects non-admin actors", async () => {
    const repository = createRepository();

    await expect(
      listRawMaterials(grillMasterProfile, { activeOnly: true }, repository),
    ).rejects.toMatchObject({ code: "forbidden" });

    expect(repository.listByMerchant).not.toHaveBeenCalled();
  });

  it("returns items sorted by name", async () => {
    const repository = createRepository({
      listByMerchant: vi.fn().mockResolvedValue([
        { ...baseMaterial, id: "b", name: "Zanahoria" },
        { ...baseMaterial, id: "a", name: "Aceite" },
      ]),
    });

    const result = await listRawMaterials(
      adminProfile,
      { activeOnly: true },
      repository,
    );

    expect(result.map((item) => item.name)).toEqual(["Aceite", "Zanahoria"]);
  });
});

describe("createRawMaterial", () => {
  it("rejects non-admin actors", async () => {
    const repository = createRepository();

    await expect(
      createRawMaterial(
        { name: "Carne", unitOfMeasure: "kilogram" },
        grillMasterProfile,
        repository,
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("persists through the repository with merchant scope", async () => {
    const created = { ...baseMaterial, name: "Carne", unitOfMeasure: "kilogram" as const };
    const repository = createRepository({
      create: vi.fn().mockResolvedValue(created),
    });

    const result = await createRawMaterial(
      { name: "Carne", unitOfMeasure: "kilogram" },
      adminProfile,
      repository,
    );

    expect(result).toEqual(created);
    expect(repository.create).toHaveBeenCalledWith({
      name: "Carne",
      sku: null,
      unitOfMeasure: "kilogram",
      merchantId: "merchant-1",
    });
  });
});

describe("updateRawMaterial", () => {
  it("rejects updates for other merchants", async () => {
    const repository = createRepository({
      getById: vi.fn().mockResolvedValue({
        ...baseMaterial,
        merchantId: "merchant-2",
      }),
    });

    await expect(
      updateRawMaterial(
        "material-1",
        { name: "Updated" },
        adminProfile,
        repository,
      ),
    ).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("deactivateRawMaterial", () => {
  it("delegates deactivation to the repository", async () => {
    const deactivated = { ...baseMaterial, isActive: false };
    const repository = createRepository({
      deactivate: vi.fn().mockResolvedValue(deactivated),
    });

    const result = await deactivateRawMaterial(
      "material-1",
      adminProfile,
      repository,
    );

    expect(result.isActive).toBe(false);
    expect(repository.deactivate).toHaveBeenCalledWith("material-1");
  });
});

describe("receiveStock", () => {
  it("rejects non-admin actors", async () => {
    const repository = createRepository();

    await expect(
      receiveStock(
        "material-1",
        { incomingQuantity: 1, incomingUnitCost: 10 },
        grillMasterProfile,
        repository,
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("computes WAC and persists receipt for fractional unit quantity", async () => {
    const repository = createRepository({
      getById: vi.fn().mockResolvedValue({
        ...baseMaterial,
        quantityOnHand: 0,
        unitCost: 0,
      }),
      applyReceipt: vi.fn().mockResolvedValue({
        ...baseMaterial,
        quantityOnHand: 0.5,
        unitCost: 12.5,
      }),
    });

    const result = await receiveStock(
      "material-1",
      { incomingQuantity: 0.5, incomingUnitCost: 12.5 },
      adminProfile,
      repository,
    );

    expect(result.quantityOnHand).toBe(0.5);
    expect(repository.applyReceipt).toHaveBeenCalledWith({
      rawMaterialId: "material-1",
      quantityOnHand: 0.5,
      unitCost: 12.5,
      movementQuantity: 0.5,
      movementUnitCost: 12.5,
    });
  });

  it("blends WAC when stock already exists", async () => {
    const repository = createRepository({
      getById: vi.fn().mockResolvedValue({
        ...baseMaterial,
        quantityOnHand: 10,
        unitCost: 20,
      }),
      applyReceipt: vi.fn().mockImplementation(async (params) => ({
        ...baseMaterial,
        quantityOnHand: params.quantityOnHand,
        unitCost: params.unitCost,
      })),
    });

    await receiveStock(
      "material-1",
      { incomingQuantity: 10, incomingUnitCost: 30 },
      adminProfile,
      repository,
    );

    expect(repository.applyReceipt).toHaveBeenCalledWith({
      rawMaterialId: "material-1",
      quantityOnHand: 20,
      unitCost: 25,
      movementQuantity: 10,
      movementUnitCost: 30,
    });
  });
});
