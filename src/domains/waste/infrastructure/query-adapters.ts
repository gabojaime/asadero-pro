"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ActionFailure,
  MeatPlateCostingSnapshotDto,
} from "@/domains/waste/infrastructure/waste-costing-actions";

export function meatPlateCostingQueryKey(merchantId: string) {
  return ["meat-plate-costing", merchantId] as const;
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

export function useMeatPlateCostingRows(merchantId: string | null) {
  return useQuery({
    queryKey: meatPlateCostingQueryKey(merchantId ?? "unknown"),
    enabled: Boolean(merchantId),
    staleTime: 60_000,
    queryFn: async () => {
      const { listMeatPlateCostingAction } = await import(
        "@/domains/waste/infrastructure/waste-costing-actions"
      );
      const result = await listMeatPlateCostingAction();
      return unwrapActionResult(result).snapshot as MeatPlateCostingSnapshotDto;
    },
  });
}

export function useUpdateWastePct(merchantId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { menuItemId: string; wastePct: number }) => {
      const { updateWastePctAction } = await import(
        "@/domains/waste/infrastructure/waste-costing-actions"
      );
      const result = await updateWastePctAction(input);
      return unwrapActionResult(result).snapshot as MeatPlateCostingSnapshotDto;
    },
    onSuccess: (snapshot) => {
      if (merchantId) {
        queryClient.setQueryData(meatPlateCostingQueryKey(merchantId), snapshot);
      }
    },
  });
}

export function useUpdateTargetFoodCostPct(merchantId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { targetFoodCostPct: number }) => {
      const { updateTargetFoodCostPctAction } = await import(
        "@/domains/waste/infrastructure/waste-costing-actions"
      );
      const result = await updateTargetFoodCostPctAction(input);
      return unwrapActionResult(result).snapshot as MeatPlateCostingSnapshotDto;
    },
    onSuccess: (snapshot) => {
      if (merchantId) {
        queryClient.setQueryData(meatPlateCostingQueryKey(merchantId), snapshot);
      }
    },
  });
}

export type { MeatPlateCostingSnapshotDto };
