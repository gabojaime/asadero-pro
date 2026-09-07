import type { SessionProfile } from "@/domains/auth/domain/entities";
import { RawMaterialError } from "../domain/errors";
import type {
  CreateRawMaterialInput,
  ListRawMaterialsFilters,
  RawMaterial,
  ReceiveStockInput,
  UpdateRawMaterialInput,
} from "../domain/entities";
import type { RawMaterialRepository } from "../domain/repository";
import {
  parseCreateRawMaterialInput,
  parseReceiveStockInput,
  parseUpdateRawMaterialInput,
} from "../domain/validations";
import { updateWeightedAverageCost } from "../domain/weighted-average-cost";

function assertAdmin(profile: SessionProfile): void {
  if (profile.role !== "admin") {
    throw new RawMaterialError(
      "forbidden",
      "Solo los administradores pueden gestionar el inventario.",
    );
  }

  if (!profile.merchantId) {
    throw new RawMaterialError(
      "forbidden",
      "Se requiere el contexto del negocio.",
    );
  }
}

function sortByName(items: RawMaterial[]): RawMaterial[] {
  return [...items].sort((left, right) =>
    left.name.localeCompare(right.name, "es"),
  );
}

export async function listRawMaterials(
  profile: SessionProfile,
  filters: ListRawMaterialsFilters | undefined,
  repository: RawMaterialRepository,
): Promise<RawMaterial[]> {
  assertAdmin(profile);

  const items = await repository.listByMerchant(profile.merchantId!, filters);
  return sortByName(items);
}

export async function createRawMaterial(
  input: CreateRawMaterialInput,
  profile: SessionProfile,
  repository: RawMaterialRepository,
): Promise<RawMaterial> {
  assertAdmin(profile);

  const validation = parseCreateRawMaterialInput(input);
  if (!validation.success) {
    throw new RawMaterialError(
      "validation_failed",
      "Invalid raw material input.",
      validation.fieldErrors,
    );
  }

  return repository.create({
    ...validation.data,
    merchantId: profile.merchantId!,
  });
}

export async function updateRawMaterial(
  id: string,
  input: UpdateRawMaterialInput,
  profile: SessionProfile,
  repository: RawMaterialRepository,
): Promise<RawMaterial> {
  assertAdmin(profile);

  const validation = parseUpdateRawMaterialInput(input);
  if (!validation.success) {
    throw new RawMaterialError(
      "validation_failed",
      "Invalid raw material input.",
      validation.fieldErrors,
    );
  }

  const existing = await repository.getById(id);
  if (!existing || existing.merchantId !== profile.merchantId) {
    throw new RawMaterialError("not_found", "Insumo no encontrado.");
  }

  return repository.update(id, validation.data);
}

export async function deactivateRawMaterial(
  id: string,
  profile: SessionProfile,
  repository: RawMaterialRepository,
): Promise<RawMaterial> {
  assertAdmin(profile);

  const existing = await repository.getById(id);
  if (!existing || existing.merchantId !== profile.merchantId) {
    throw new RawMaterialError("not_found", "Insumo no encontrado.");
  }

  return repository.deactivate(id);
}

export async function receiveStock(
  id: string,
  input: ReceiveStockInput,
  profile: SessionProfile,
  repository: RawMaterialRepository,
): Promise<RawMaterial> {
  assertAdmin(profile);

  const validation = parseReceiveStockInput(input);
  if (!validation.success) {
    throw new RawMaterialError(
      "validation_failed",
      "Invalid receipt input.",
      validation.fieldErrors,
    );
  }

  const existing = await repository.getById(id);
  if (!existing || existing.merchantId !== profile.merchantId) {
    throw new RawMaterialError("not_found", "Insumo no encontrado.");
  }

  const updatedTotals = updateWeightedAverageCost({
    currentQuantity: existing.quantityOnHand,
    currentUnitCost: existing.unitCost,
    incomingQuantity: validation.data.incomingQuantity,
    incomingUnitCost: validation.data.incomingUnitCost,
  });

  return repository.applyReceipt({
    rawMaterialId: id,
    quantityOnHand: updatedTotals.quantityOnHand,
    unitCost: updatedTotals.unitCost,
    movementQuantity: validation.data.incomingQuantity,
    movementUnitCost: validation.data.incomingUnitCost,
  });
}

export async function listRawMaterialMovements(
  rawMaterialId: string,
  profile: SessionProfile,
  repository: RawMaterialRepository,
  limit = 10,
) {
  assertAdmin(profile);

  const existing = await repository.getById(rawMaterialId);
  if (!existing || existing.merchantId !== profile.merchantId) {
    throw new RawMaterialError("not_found", "Insumo no encontrado.");
  }

  return repository.listMovements(rawMaterialId, limit);
}
