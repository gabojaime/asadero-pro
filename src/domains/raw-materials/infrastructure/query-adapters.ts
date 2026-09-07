"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateRawMaterialInput,
  ListRawMaterialsFilters,
  ReceiveStockInput,
  UpdateRawMaterialInput,
} from "@/domains/raw-materials/domain/entities";
import {
  createRawMaterialAction,
  deactivateRawMaterialAction,
  listRawMaterialMovementsAction,
  listRawMaterialsAction,
  receiveStockAction,
  updateRawMaterialAction,
  type ActionFailure,
  type RawMaterialDto,
} from "@/domains/raw-materials/infrastructure/raw-material-actions";

export function rawMaterialsQueryKey(
  merchantId: string,
  filters?: ListRawMaterialsFilters,
) {
  return ["raw-materials", merchantId, filters ?? { activeOnly: true }] as const;
}

export function rawMaterialMovementsQueryKey(
  merchantId: string,
  rawMaterialId: string,
) {
  return ["raw-materials", merchantId, rawMaterialId, "movements"] as const;
}

function throwActionError(result: ActionFailure): never {
  const error = new Error(result.message);
  Object.assign(error, {
    code: result.code,
    fieldErrors: result.fieldErrors,
  });
  throw error;
}

function unwrapActionResult<T extends { success: true }>(
  result: T | ActionFailure,
): T {
  if (result.success === false) {
    throwActionError(result);
  }

  return result;
}

export function useRawMaterials(
  merchantId: string | null,
  filters?: ListRawMaterialsFilters,
) {
  return useQuery({
    queryKey: rawMaterialsQueryKey(merchantId ?? "unknown", filters),
    enabled: Boolean(merchantId),
    queryFn: async () => {
      const result = await listRawMaterialsAction(filters);
      return unwrapActionResult(result).items;
    },
  });
}

export function useRawMaterialMovements(
  merchantId: string | null,
  rawMaterialId: string | null,
  enabled = false,
) {
  return useQuery({
    queryKey: rawMaterialMovementsQueryKey(
      merchantId ?? "unknown",
      rawMaterialId ?? "unknown",
    ),
    enabled: Boolean(merchantId && rawMaterialId && enabled),
    queryFn: async () => {
      const result = await listRawMaterialMovementsAction(rawMaterialId!);
      return unwrapActionResult(result).movements;
    },
  });
}

function invalidateRawMaterials(
  queryClient: ReturnType<typeof useQueryClient>,
  merchantId: string,
) {
  queryClient.invalidateQueries({
    queryKey: ["raw-materials", merchantId],
  });
}

export function useCreateRawMaterial(merchantId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateRawMaterialInput) => {
      const result = await createRawMaterialAction(input);
      return unwrapActionResult(result).item;
    },
    onSuccess: () => {
      if (merchantId) {
        invalidateRawMaterials(queryClient, merchantId);
      }
    },
  });
}

export function useUpdateRawMaterial(merchantId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: UpdateRawMaterialInput;
    }) => {
      const result = await updateRawMaterialAction(id, input);
      return unwrapActionResult(result).item;
    },
    onSuccess: () => {
      if (merchantId) {
        invalidateRawMaterials(queryClient, merchantId);
      }
    },
  });
}

export function useDeactivateRawMaterial(merchantId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deactivateRawMaterialAction(id);
      return unwrapActionResult(result).item;
    },
    onSuccess: () => {
      if (merchantId) {
        invalidateRawMaterials(queryClient, merchantId);
      }
    },
  });
}

export function useReceiveStock(merchantId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: ReceiveStockInput;
    }) => {
      const result = await receiveStockAction(id, input);
      return unwrapActionResult(result).item;
    },
    onSuccess: (_item, variables) => {
      if (merchantId) {
        invalidateRawMaterials(queryClient, merchantId);
        queryClient.invalidateQueries({
          queryKey: rawMaterialMovementsQueryKey(merchantId, variables.id),
        });
      }
    },
  });
}

export type { RawMaterialDto };
