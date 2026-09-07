"use server";

import {
  createRawMaterial,
  deactivateRawMaterial,
  listRawMaterialMovements,
  listRawMaterials,
  receiveStock,
  updateRawMaterial,
} from "@/domains/raw-materials/application/use-cases";
import type {
  CreateRawMaterialInput,
  ListRawMaterialsFilters,
  ReceiveStockInput,
  UpdateRawMaterialInput,
} from "@/domains/raw-materials/domain/entities";
import { RawMaterialError } from "@/domains/raw-materials/domain/errors";
import { createRawMaterialRepository } from "@/domains/raw-materials/infrastructure/supabase-repo";
import { getServerSessionProfile } from "@/domains/auth/infrastructure/session-profile-server";
import { createClient } from "@/shared/infrastructure/supabase/server";

type ActionFailure = {
  success: false;
  code: string;
  message: string;
  fieldErrors?: Record<string, string>;
};

type RawMaterialDto = {
  id: string;
  merchantId: string;
  name: string;
  sku: string | null;
  unitOfMeasure: string;
  quantityOnHand: number;
  unitCost: number;
  isActive: boolean;
  updatedAt: string;
};

type MovementDto = {
  id: string;
  quantity: number;
  unitCost: number;
  createdAt: string;
};

function serializeRawMaterial(material: {
  id: string;
  merchantId: string;
  name: string;
  sku: string | null;
  unitOfMeasure: string;
  quantityOnHand: number;
  unitCost: number;
  isActive: boolean;
  updatedAt: Date;
}): RawMaterialDto {
  return {
    ...material,
    updatedAt: material.updatedAt.toISOString(),
  };
}

function mapError(error: unknown): ActionFailure {
  if (error instanceof RawMaterialError) {
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

async function withRepository<T>(
  handler: (
    profile: NonNullable<Awaited<ReturnType<typeof getServerSessionProfile>>>,
    repository: ReturnType<typeof createRawMaterialRepository>,
  ) => Promise<T>,
): Promise<T | ActionFailure> {
  const profile = await getServerSessionProfile();

  if (!profile) {
    return {
      success: false,
      code: "not_authenticated",
      message: "Debes iniciar sesión para continuar.",
    };
  }

  try {
    const supabase = await createClient();
    const repository = createRawMaterialRepository(supabase);
    return await handler(profile, repository);
  } catch (error) {
    return mapError(error);
  }
}

export async function listRawMaterialsAction(filters?: ListRawMaterialsFilters) {
  const result = await withRepository(async (profile, repository) => {
    const items = await listRawMaterials(profile, filters, repository);
    return {
      success: true as const,
      items: items.map(serializeRawMaterial),
    };
  });

  return result;
}

export async function listRawMaterialMovementsAction(
  rawMaterialId: string,
  limit = 10,
) {
  const result = await withRepository(async (profile, repository) => {
    const movements = await listRawMaterialMovements(
      rawMaterialId,
      profile,
      repository,
      limit,
    );

    return {
      success: true as const,
      movements: movements.map(
        (movement): MovementDto => ({
          id: movement.id,
          quantity: movement.quantity,
          unitCost: movement.unitCost,
          createdAt: movement.createdAt.toISOString(),
        }),
      ),
    };
  });

  return result;
}

export async function createRawMaterialAction(input: CreateRawMaterialInput) {
  const result = await withRepository(async (profile, repository) => {
    const created = await createRawMaterial(input, profile, repository);
    return {
      success: true as const,
      item: serializeRawMaterial(created),
    };
  });

  return result;
}

export async function updateRawMaterialAction(
  id: string,
  input: UpdateRawMaterialInput,
) {
  const result = await withRepository(async (profile, repository) => {
    const updated = await updateRawMaterial(id, input, profile, repository);
    return {
      success: true as const,
      item: serializeRawMaterial(updated),
    };
  });

  return result;
}

export async function deactivateRawMaterialAction(id: string) {
  const result = await withRepository(async (profile, repository) => {
    const deactivated = await deactivateRawMaterial(id, profile, repository);
    return {
      success: true as const,
      item: serializeRawMaterial(deactivated),
    };
  });

  return result;
}

export async function receiveStockAction(
  id: string,
  input: ReceiveStockInput,
) {
  const result = await withRepository(async (profile, repository) => {
    const updated = await receiveStock(id, input, profile, repository);
    return {
      success: true as const,
      item: serializeRawMaterial(updated),
    };
  });

  return result;
}

export type {
  ActionFailure,
  MovementDto,
  RawMaterialDto,
};
