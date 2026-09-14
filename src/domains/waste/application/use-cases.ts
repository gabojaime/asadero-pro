import type { SessionProfile } from "@/domains/auth/domain/entities";
import { WasteError } from "../domain/errors";
import type {
  CostingRepository,
  MeatPlateCostingSnapshot,
} from "../domain/repository";
import {
  parseUpdateTargetFoodCostPctInput,
  parseUpdateWastePctInput,
} from "../domain/validations";
import {
  buildMeatPlateCostingSnapshot,
} from "./build-costing-row";

function assertAdmin(profile: SessionProfile): void {
  if (profile.role !== "admin") {
    throw new WasteError(
      "forbidden",
      "Solo los administradores pueden gestionar merma y costos.",
    );
  }

  if (!profile.merchantId) {
    throw new WasteError("forbidden", "Se requiere el contexto del negocio.");
  }
}

function sortCostingRows<T extends { proteinGroup: string | null; weightLabel: string | null; name: string }>(
  rows: T[],
): T[] {
  const proteinOrder = { beef: 0, pork: 1, chicken: 2 } as const;

  return [...rows].sort((left, right) => {
    const leftGroup =
      left.proteinGroup != null
        ? (proteinOrder[left.proteinGroup as keyof typeof proteinOrder] ?? 99)
        : 99;
    const rightGroup =
      right.proteinGroup != null
        ? (proteinOrder[right.proteinGroup as keyof typeof proteinOrder] ?? 99)
        : 99;

    if (leftGroup !== rightGroup) {
      return leftGroup - rightGroup;
    }

    const leftWeight = left.weightLabel ?? "";
    const rightWeight = right.weightLabel ?? "";
    if (leftWeight !== rightWeight) {
      return leftWeight.localeCompare(rightWeight, "es");
    }

    return left.name.localeCompare(right.name, "es");
  });
}

export async function listMeatPlateCosting(
  profile: SessionProfile,
  repository: CostingRepository,
): Promise<MeatPlateCostingSnapshot> {
  assertAdmin(profile);

  const { targetFoodCostPct, rows } = await repository.listMeatPlateCosting(
    profile.merchantId!,
  );

  const snapshot = buildMeatPlateCostingSnapshot(targetFoodCostPct, rows);
  return {
    ...snapshot,
    rows: sortCostingRows(snapshot.rows),
  };
}

export async function updateWastePct(
  input: unknown,
  profile: SessionProfile,
  repository: CostingRepository,
): Promise<MeatPlateCostingSnapshot> {
  assertAdmin(profile);

  const validation = parseUpdateWastePctInput(input);
  if (!validation.success) {
    throw new WasteError(
      "validation_failed",
      "Invalid waste percentage input.",
      validation.fieldErrors,
    );
  }

  await repository.upsertWastePct({
    merchantId: profile.merchantId!,
    menuItemId: validation.data.menuItemId,
    wastePct: validation.data.wastePct,
  });

  return listMeatPlateCosting(profile, repository);
}

export async function updateTargetFoodCostPct(
  input: unknown,
  profile: SessionProfile,
  repository: CostingRepository,
): Promise<MeatPlateCostingSnapshot> {
  assertAdmin(profile);

  const validation = parseUpdateTargetFoodCostPctInput(input);
  if (!validation.success) {
    throw new WasteError(
      "validation_failed",
      "Invalid target food cost input.",
      validation.fieldErrors,
    );
  }

  await repository.updateTargetFoodCostPct({
    merchantId: profile.merchantId!,
    targetFoodCostPct: validation.data.targetFoodCostPct,
  });

  return listMeatPlateCosting(profile, repository);
}
