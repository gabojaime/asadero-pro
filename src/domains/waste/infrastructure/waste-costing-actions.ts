"use server";

import {
  listMeatPlateCosting,
  updateTargetFoodCostPct,
  updateWastePct,
} from "@/domains/waste/application/use-cases";
import type { MeatPlateCostingRow } from "@/domains/waste/domain/entities";
import { WasteError } from "@/domains/waste/domain/errors";
import { createCostingRepository } from "@/domains/waste/infrastructure/supabase-costing-repo";
import { getServerSessionProfile } from "@/domains/auth/infrastructure/session-profile-server";
import { createClient } from "@/shared/infrastructure/supabase/server";

type ActionFailure = {
  success: false;
  code: string;
  message: string;
  fieldErrors?: Record<string, string>;
};

type MeatPlateCostingRowDto = MeatPlateCostingRow;
type MeatPlateCostingSnapshotDto = {
  targetFoodCostPct: number;
  rows: MeatPlateCostingRowDto[];
};

function mapError(error: unknown): ActionFailure {
  if (error instanceof WasteError) {
    return {
      success: false,
      code: error.code,
      message: error.message,
      fieldErrors: error.fieldErrors,
    };
  }

  return {
    success: false,
    code: "unknown",
    message: "No se pudo completar la operación. Intenta de nuevo.",
  };
}

async function getAuthenticatedContext() {
  const profile = await getServerSessionProfile();
  if (!profile?.merchantId || !profile.role) {
    throw new WasteError("forbidden", "Sesión inválida.");
  }

  const supabase = await createClient();
  return {
    profile,
    costingRepo: createCostingRepository(supabase),
  };
}

export async function listMeatPlateCostingAction(): Promise<
  { success: true; snapshot: MeatPlateCostingSnapshotDto } | ActionFailure
> {
  try {
    const { profile, costingRepo } = await getAuthenticatedContext();
    const snapshot = await listMeatPlateCosting(profile, costingRepo);
    return { success: true, snapshot };
  } catch (error) {
    return mapError(error);
  }
}

export async function updateWastePctAction(input: {
  menuItemId: string;
  wastePct: number;
}): Promise<
  { success: true; snapshot: MeatPlateCostingSnapshotDto } | ActionFailure
> {
  try {
    const { profile, costingRepo } = await getAuthenticatedContext();
    const snapshot = await updateWastePct(input, profile, costingRepo);
    return { success: true, snapshot };
  } catch (error) {
    return mapError(error);
  }
}

export async function updateTargetFoodCostPctAction(input: {
  targetFoodCostPct: number;
}): Promise<
  { success: true; snapshot: MeatPlateCostingSnapshotDto } | ActionFailure
> {
  try {
    const { profile, costingRepo } = await getAuthenticatedContext();
    const snapshot = await updateTargetFoodCostPct(input, profile, costingRepo);
    return { success: true, snapshot };
  } catch (error) {
    return mapError(error);
  }
}

export type {
  ActionFailure,
  MeatPlateCostingRowDto,
  MeatPlateCostingSnapshotDto,
};
